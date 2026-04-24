"""
CSV upload endpoints for importing transactions.
Supports preview and confirmation workflow.
"""

import json
import csv
import tempfile
import os
from typing import Optional
from datetime import date, datetime
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import require_user
from app.models.user import User
from app.models.transaction import Transaction
from app.services.csv_parser import (
    detect_delimiter,
    detect_columns,
    detect_column_types,
    parse_csv_content,
    detect_duplicates,
    parse_date,
)
from app.middleware.sanitize import sanitize_filename


class CSVConfirmRequest(BaseModel):
    file_id: str
    mapping: dict[str, str]

router = APIRouter()

# Temporary file storage for previewed CSVs
TEMP_CSV_DIR = tempfile.gettempdir()


def _save_temp_csv(content: str, file_id: str) -> str:
    """Save CSV content to temp file and return path."""
    path = os.path.join(TEMP_CSV_DIR, f"csv_{file_id}.csv")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return path


def _load_temp_csv(file_id: str) -> Optional[str]:
    """Load CSV content from temp file."""
    path = os.path.join(TEMP_CSV_DIR, f"csv_{file_id}.csv")
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    return None


def _cleanup_temp_csv(file_id: str) -> None:
    """Delete temp CSV file."""
    path = os.path.join(TEMP_CSV_DIR, f"csv_{file_id}.csv")
    if os.path.exists(path):
        try:
            os.remove(path)
        except:
            pass


@router.post("/upload")
async def csv_preview(
    file: UploadFile = File(...),
    user: User = Depends(require_user),
    http_request: Request = Request,
):
    """
    Preview CSV upload - validate format and detect columns.

    Returns:
    {
        "file_id": "unique-id",
        "columns": [...],
        "preview_rows": [...],
        "total_rows": N,
        "suggested_mapping": {...}
    }
    """
    # Validate file type and sanitize filename
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # Sanitize filename to prevent path traversal
    safe_filename = sanitize_filename(file.filename)

    # Read file content
    try:
        content = await file.read()
        text_content = content.decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # Validate size (5MB max)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    # Parse CSV
    try:
        delimiter = detect_delimiter(text_content)
        reader = csv.DictReader(StringIO(text_content), delimiter=delimiter)
        headers = reader.fieldnames or []

        if not headers:
            raise HTTPException(status_code=400, detail="CSV has no headers")

        # Read sample rows
        sample_rows = []
        all_rows = []
        for idx, row in enumerate(reader):
            # Convert to list for processing
            row_list = [row.get(h, '') for h in headers]
            all_rows.append(row_list)
            if idx < 5:
                sample_rows.append(row_list)

        total_rows = len(all_rows)

        if total_rows == 0:
            raise HTTPException(status_code=400, detail="CSV has no data rows")

    except csv.Error as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")

    # Detect columns
    detected_mapping = detect_columns(headers, sample_rows)
    column_info = detect_column_types(headers, sample_rows)

    # Create preview rows (first 5)
    preview_rows = []
    for row_list in sample_rows:
        row_dict = {headers[i]: row_list[i] for i in range(len(headers))}
        preview_rows.append(row_dict)

    # Generate file_id and save temp file
    import uuid
    file_id = str(uuid.uuid4())
    _save_temp_csv(text_content, file_id)

    return {
        "file_id": file_id,
        "columns": column_info,
        "preview_rows": preview_rows,
        "total_rows": total_rows,
        "suggested_mapping": detected_mapping,
    }


@router.post("/confirm")
async def csv_confirm(
    request: CSVConfirmRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm and import CSV data.

    Expected JSON:
    {
        "file_id": "...",
        "mapping": {
            "date_col": "Date",
            "amount_col": "Amount",
            "description_col": "Description",
            "category_col": "Category"
        }
    }

    Returns:
    {
        "imported": N,
        "skipped_duplicates": N,
        "errors": [{"row": N, "reason": "..."}]
    }
    """
    file_id = request.file_id
    mapping = request.mapping

    if not file_id:
        raise HTTPException(status_code=400, detail="file_id required")

    # Load temp CSV
    csv_content = _load_temp_csv(file_id)
    if not csv_content:
        raise HTTPException(status_code=400, detail="File not found or expired")

    try:
        # Validate mapping
        required_keys = ['date_col', 'amount_col', 'description_col', 'category_col']
        for key in required_keys:
            if not mapping.get(key):
                raise HTTPException(status_code=400, detail=f"Missing mapping: {key}")

        # Parse CSV with mapping
        parsed_rows, parse_errors = parse_csv_content(csv_content, mapping)

        if not parsed_rows:
            return {
                "imported": 0,
                "skipped_duplicates": 0,
                "errors": [{"row": r, "reason": e} for r, e in parse_errors],
            }

        # Get existing transactions for duplicate detection
        result = await db.execute(
            select(Transaction).where(Transaction.user_id == user.id)
        )
        existing_txns = result.scalars().all()
        existing_dicts = [
            {
                "date": t.date.isoformat() if isinstance(t.date, date) else str(t.date),
                "amount": t.amount,
                "description": t.description,
            }
            for t in existing_txns
        ]

        # Detect duplicates
        new_rows, duplicate_list = detect_duplicates(parsed_rows, existing_dicts)

        # Insert new transactions
        imported_count = 0
        import_errors = []

        for idx, row in enumerate(new_rows):
            try:
                # Determine transaction type based on is_negative flag
                txn_type = "debit" if row.get('is_negative') else "credit"

                transaction = Transaction(
                    user_id=user.id,
                    date=datetime.strptime(row['date'], '%Y-%m-%d').date(),
                    description=row['description'],
                    amount=row['amount'],
                    type=txn_type,
                    category=row['category'],
                    status="pending",
                )
                db.add(transaction)
                imported_count += 1
            except Exception as e:
                import_errors.append({
                    "row": idx,
                    "reason": f"Failed to insert: {str(e)}"
                })

        # Combine all errors
        all_errors = (
            import_errors +
            [{"row": r, "reason": reason} for r, reason in duplicate_list]
        )

        # Commit transaction
        await db.commit()

        # Cleanup temp file
        _cleanup_temp_csv(file_id)

        return {
            "imported": imported_count,
            "skipped_duplicates": len(duplicate_list),
            "errors": all_errors,
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
