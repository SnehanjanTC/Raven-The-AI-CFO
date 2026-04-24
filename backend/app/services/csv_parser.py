"""
CSV parser service for flexible CSV import.
Handles delimiter detection, column type detection, and data parsing.
"""

import csv
import re
from datetime import datetime
from typing import List, Tuple, Dict, Optional
from io import StringIO


def detect_delimiter(content: str) -> str:
    """
    Detect CSV delimiter by analyzing first few lines.
    Returns comma, tab, or semicolon.
    """
    lines = content.split('\n')[:5]  # Check first 5 lines
    sample = '\n'.join(lines)

    # Try each delimiter and count fields
    for delimiter in [',', '\t', ';']:
        reader = csv.reader(StringIO(sample), delimiter=delimiter)
        try:
            field_counts = [len(row) for row in reader if row]
            if field_counts:
                # Check consistency - most delimiters should have consistent field count
                avg_fields = sum(field_counts) / len(field_counts)
                if avg_fields > 1:  # At least 2 fields
                    return delimiter
        except:
            pass

    return ','  # Default to comma


def parse_date(value: str) -> Optional[str]:
    """
    Parse flexible date formats and return ISO format (YYYY-MM-DD).
    Handles: MM/DD/YYYY, YYYY-MM-DD, DD-Mon-YY, DD/MM/YYYY, etc.
    Returns None if parsing fails.
    """
    if not value or not isinstance(value, str):
        return None

    value = value.strip()
    if not value:
        return None

    # Common date formats to try
    formats = [
        '%m/%d/%Y',    # 01/15/2024
        '%Y-%m-%d',    # 2024-01-15
        '%d-%b-%y',    # 15-Jan-24
        '%d/%m/%Y',    # 15/01/2024
        '%m-%d-%Y',    # 01-15-2024
        '%d.%m.%Y',    # 15.01.2024
        '%Y/%m/%d',    # 2024/01/15
        '%d %b %Y',    # 15 Jan 2024
        '%d %B %Y',    # 15 January 2024
        '%m/%d/%y',    # 01/15/24
        '%d/%m/%y',    # 15/01/24
    ]

    for fmt in formats:
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.strftime('%Y-%m-%d')
        except ValueError:
            pass

    return None


def parse_amount(value: str) -> Optional[float]:
    """
    Parse flexible amount formats.
    Handles: $1,000.50, 1000.50, (500), -500, €1000, ₹1000, etc.
    Returns None if parsing fails.
    """
    if not value or not isinstance(value, str):
        return None

    value = value.strip()
    if not value:
        return None

    # Remove currency symbols
    value = re.sub(r'[$€₹£¥₽₩₪₦₨₱₹₽]', '', value)

    # Check for parenthetical negatives (accounting notation)
    is_negative = False
    if value.startswith('(') and value.endswith(')'):
        is_negative = True
        value = value[1:-1]

    # Remove commas and spaces
    value = value.replace(',', '').replace(' ', '')

    # Check for explicit minus sign
    if value.startswith('-'):
        is_negative = True

    try:
        amount = float(value)
        if is_negative and amount > 0:
            amount = -amount
        return amount
    except ValueError:
        return None


def detect_columns(headers: List[str], sample_rows: List[List[str]]) -> Dict[str, str]:
    """
    Auto-detect column types from headers and sample rows.
    Returns dict with detected column indices for: date_col, amount_col, description_col, category_col
    """
    detected = {
        'date_col': None,
        'amount_col': None,
        'description_col': None,
        'category_col': None,
    }

    headers_lower = [h.lower().strip() for h in headers]

    # Detect date column
    date_keywords = ['date', 'transaction date', 'posted', 'posted date', 'when', 'day']
    for idx, h in enumerate(headers_lower):
        if any(kw in h for kw in date_keywords):
            detected['date_col'] = headers[idx]
            break

    # If no explicit date column, check first column that looks like dates
    if not detected['date_col']:
        for col_idx, header in enumerate(headers):
            sample_dates = sum(
                1 for row in sample_rows
                if col_idx < len(row) and parse_date(row[col_idx])
            )
            if sample_dates >= len(sample_rows) * 0.5:  # At least 50% date-like
                detected['date_col'] = header
                break

    # Detect amount column
    amount_keywords = ['amount', 'value', 'price', 'total', 'sum', 'cost', 'expense', 'income', 'revenue']
    for idx, h in enumerate(headers_lower):
        if any(kw in h for kw in amount_keywords):
            detected['amount_col'] = headers[idx]
            break

    # If no explicit amount column, find numeric column with most valid amounts
    if not detected['amount_col']:
        best_col = None
        best_score = 0
        for col_idx, header in enumerate(headers):
            valid_amounts = sum(
                1 for row in sample_rows
                if col_idx < len(row) and parse_amount(row[col_idx]) is not None
            )
            if valid_amounts > best_score:
                best_score = valid_amounts
                best_col = header
        if best_col and best_score >= len(sample_rows) * 0.5:
            detected['amount_col'] = best_col

    # Detect description column (longest text)
    if len(sample_rows) > 0:
        best_col = None
        best_avg_length = 0
        for col_idx, header in enumerate(headers):
            avg_length = sum(
                len(row[col_idx]) for row in sample_rows
                if col_idx < len(row)
            ) / max(len(sample_rows), 1)
            if avg_length > best_avg_length and avg_length > 10:
                best_avg_length = avg_length
                best_col = header
        if best_col:
            detected['description_col'] = best_col

    # Detect category column (repeated short values)
    if len(sample_rows) > 0:
        best_col = None
        best_entropy = 0
        for col_idx, header in enumerate(headers):
            values = [
                row[col_idx] for row in sample_rows
                if col_idx < len(row)
            ]
            unique_count = len(set(values))
            if unique_count > 1 and unique_count <= len(values) * 0.7:  # Some repetition
                avg_length = sum(len(v) for v in values) / max(len(values), 1)
                # Prefer shorter values (typical of categories)
                if 2 < avg_length < 20:
                    entropy = unique_count / len(values)  # How diverse
                    if entropy > best_entropy:
                        best_entropy = entropy
                        best_col = header
        if best_col:
            detected['category_col'] = best_col

    return detected


def detect_column_types(headers: List[str], sample_rows: List[List[str]]) -> List[Dict]:
    """
    Analyze each column and return type info.
    Returns list of dicts with: name, detected_type, sample_values
    """
    result = []

    for col_idx, header in enumerate(headers):
        sample_values = [
            row[col_idx] for row in sample_rows
            if col_idx < len(row)
        ]

        # Try to detect type
        detected_type = 'text'

        # Check if mostly numeric
        numeric_count = sum(1 for v in sample_values if parse_amount(v) is not None)
        if numeric_count >= len(sample_values) * 0.7:
            detected_type = 'amount'

        # Check if mostly dates
        date_count = sum(1 for v in sample_values if parse_date(v) is not None)
        if date_count >= len(sample_values) * 0.7:
            detected_type = 'date'

        result.append({
            'name': header,
            'detected_type': detected_type,
            'sample_values': sample_values[:3],
        })

    return result


def detect_duplicates(
    new_rows: List[Dict],
    existing_transactions: List[Dict]
) -> Tuple[List[Dict], List[Tuple[int, str]]]:
    """
    Check new rows for duplicates based on date + amount + description.
    Returns (new_rows, duplicates_with_reasons).
    duplicates_with_reasons is list of (row_index, reason_str).
    """
    new_transactions = []
    duplicates = []

    # Create a set of existing transaction signatures
    existing_sigs = set()
    for txn in existing_transactions:
        sig = (
            txn.get('date'),
            round(float(txn.get('amount', 0)), 2),
            txn.get('description', '').lower().strip()
        )
        existing_sigs.add(sig)

    for idx, row in enumerate(new_rows):
        sig = (
            row.get('date'),
            round(float(row.get('amount', 0)), 2),
            row.get('description', '').lower().strip()
        )

        if sig in existing_sigs:
            duplicates.append((idx, "Duplicate of existing transaction"))
        else:
            new_transactions.append(row)
            existing_sigs.add(sig)

    return new_transactions, duplicates


def parse_csv_content(
    content: str,
    mapping: Dict[str, str]
) -> Tuple[List[Dict], List[Tuple[int, str]]]:
    """
    Parse CSV content with column mapping.
    Returns (parsed_rows, errors_with_reasons).
    errors_with_reasons is list of (row_index, error_message).

    Args:
        content: Raw CSV content
        mapping: Dict with keys date_col, amount_col, description_col, category_col
                 mapping to actual column names
    """
    delimiter = detect_delimiter(content)
    reader = csv.DictReader(StringIO(content), delimiter=delimiter)

    parsed_rows = []
    errors = []

    date_col = mapping.get('date_col')
    amount_col = mapping.get('amount_col')
    description_col = mapping.get('description_col')
    category_col = mapping.get('category_col')

    for row_idx, row in enumerate(reader, start=1):
        parsed_row = {}

        # Parse date
        if date_col and date_col in row:
            parsed_date = parse_date(row[date_col])
            if parsed_date:
                parsed_row['date'] = parsed_date
            else:
                errors.append((row_idx, f"Invalid date in '{date_col}': {row[date_col]}"))
                continue
        else:
            errors.append((row_idx, "No date column specified or found"))
            continue

        # Parse amount
        if amount_col and amount_col in row:
            parsed_amount = parse_amount(row[amount_col])
            if parsed_amount is not None:
                parsed_row['amount'] = abs(parsed_amount)  # Store as positive, type determines sign
                parsed_row['is_negative'] = parsed_amount < 0
            else:
                errors.append((row_idx, f"Invalid amount in '{amount_col}': {row[amount_col]}"))
                continue
        else:
            errors.append((row_idx, "No amount column specified or found"))
            continue

        # Description
        if description_col and description_col in row:
            parsed_row['description'] = row[description_col].strip()
        else:
            parsed_row['description'] = ""

        # Category
        if category_col and category_col in row:
            parsed_row['category'] = row[category_col].strip()
        else:
            parsed_row['category'] = "Uncategorized"

        parsed_rows.append(parsed_row)

    return parsed_rows, errors
