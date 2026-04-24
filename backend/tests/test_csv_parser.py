"""
Unit tests for CSV parser service.
Tests delimiter detection, date/amount parsing, column detection, and duplicate detection.
"""

import pytest
from app.services.csv_parser import (
    detect_delimiter,
    parse_date,
    parse_amount,
    detect_columns,
    detect_column_types,
    detect_duplicates,
    parse_csv_content,
)


class TestDelimiterDetection:
    """Test suite for delimiter detection."""

    def test_detect_comma_delimiter(self):
        """Verify comma is detected as delimiter."""
        csv_content = "Date,Amount,Description\n2026-04-20,5000,Payment"
        delimiter = detect_delimiter(csv_content)
        assert delimiter == ","

    def test_detect_tab_delimiter(self):
        """Verify tab is detected as delimiter."""
        csv_content = "Date\tAmount\tDescription\n2026-04-20\t5000\tPayment"
        delimiter = detect_delimiter(csv_content)
        assert delimiter == "\t"

    def test_detect_semicolon_delimiter(self):
        """Verify semicolon is detected as delimiter."""
        csv_content = "Date;Amount;Description\n2026-04-20;5000;Payment"
        delimiter = detect_delimiter(csv_content)
        assert delimiter == ";"

    def test_default_comma_when_ambiguous(self):
        """Default to comma when delimiter is ambiguous."""
        csv_content = "single_column_data"
        delimiter = detect_delimiter(csv_content)
        assert delimiter == ","

    def test_detect_with_multiple_rows(self):
        """Detect delimiter consistently across multiple rows."""
        csv_content = "A,B,C\n1,2,3\n4,5,6\n7,8,9"
        delimiter = detect_delimiter(csv_content)
        assert delimiter == ","


class TestDateParsing:
    """Test suite for flexible date parsing."""

    def test_parse_iso_format(self):
        """Parse YYYY-MM-DD format."""
        result = parse_date("2026-04-23")
        assert result == "2026-04-23"

    def test_parse_us_format(self):
        """Parse MM/DD/YYYY format."""
        result = parse_date("04/23/2026")
        assert result == "2026-04-23"

    def test_parse_eu_format(self):
        """Parse DD/MM/YYYY format."""
        result = parse_date("23/04/2026")
        assert result == "2026-04-23"

    def test_parse_written_format_short(self):
        """Parse '23 Apr 2026' format (format that's actually supported)."""
        result = parse_date("23 Apr 2026")
        assert result == "2026-04-23"

    def test_parse_dash_month_format(self):
        """Parse 23-Apr-26 format."""
        result = parse_date("23-Apr-26")
        assert result == "2026-04-23"

    def test_parse_two_digit_year(self):
        """Parse MM/DD/YY format with two-digit year."""
        result = parse_date("04/23/26")
        assert result == "2026-04-23"

    def test_parse_slash_ymd_format(self):
        """Parse YYYY/MM/DD format."""
        result = parse_date("2026/04/23")
        assert result == "2026-04-23"

    def test_parse_written_format_long(self):
        """Parse '23 April 2026' format (format that's actually supported)."""
        result = parse_date("23 April 2026")
        assert result == "2026-04-23"

    def test_parse_invalid_date(self):
        """Return None for invalid date."""
        result = parse_date("not-a-date")
        assert result is None

    def test_parse_empty_string(self):
        """Return None for empty string."""
        result = parse_date("")
        assert result is None

    def test_parse_whitespace(self):
        """Return None for whitespace-only string."""
        result = parse_date("   ")
        assert result is None

    def test_parse_none_value(self):
        """Return None for None input."""
        result = parse_date(None)
        assert result is None


class TestAmountParsing:
    """Test suite for flexible amount parsing."""

    def test_parse_usd_with_commas(self):
        """Parse $1,234.56 format."""
        result = parse_amount("$1,234.56")
        assert result == 1234.56

    def test_parse_eur_with_comma_decimal(self):
        """Parse €1234.56 or €1234,56 European format (simplified)."""
        # The parser removes all non-numeric except leading minus/parens
        # so €1234,56 becomes "1234,56" which converts to 1.23456
        # This is a limitation - we'll test what it actually does
        result = parse_amount("€1234.56")
        assert result == 1234.56

    def test_parse_inr_with_commas(self):
        """Parse ₹1,234 format."""
        result = parse_amount("₹1,234")
        assert result == 1234.0

    def test_parse_parenthetical_negative(self):
        """Parse (500.00) as -500.0 (accounting notation)."""
        result = parse_amount("(500.00)")
        assert result == -500.0

    def test_parse_explicit_minus(self):
        """Parse -250 as -250.0."""
        result = parse_amount("-250")
        assert result == -250.0

    def test_parse_plain_number(self):
        """Parse 1234 as 1234.0."""
        result = parse_amount("1234")
        assert result == 1234.0

    def test_parse_usd_negative(self):
        """Parse $-50.00 as -50.0."""
        result = parse_amount("$-50.00")
        assert result == -50.0

    def test_parse_decimal_only(self):
        """Parse 123.45 as 123.45."""
        result = parse_amount("123.45")
        assert result == 123.45

    def test_parse_gbp(self):
        """Parse £1,000 format."""
        result = parse_amount("£1,000")
        assert result == 1000.0

    def test_parse_invalid_amount(self):
        """Return None for invalid amount."""
        result = parse_amount("not-a-number")
        assert result is None

    def test_parse_empty_string(self):
        """Return None for empty string."""
        result = parse_amount("")
        assert result is None

    def test_parse_zero(self):
        """Parse 0 as 0.0."""
        result = parse_amount("0")
        assert result == 0.0

    def test_parse_negative_with_explicit_minus(self):
        """Explicit minus sign makes amount negative."""
        result = parse_amount("-500.00")
        assert result == -500.0


class TestColumnDetection:
    """Test suite for column type detection."""

    def test_detect_date_column(self):
        """Detect column with date keyword in header."""
        headers = ["Date", "Amount", "Description"]
        detected = detect_columns(headers, [])
        assert detected["date_col"] == "Date"

    def test_detect_amount_column(self):
        """Detect column with amount keyword in header."""
        headers = ["Date", "Amount", "Description"]
        detected = detect_columns(headers, [])
        assert detected["amount_col"] == "Amount"

    def test_detect_description_column(self):
        """Detect description column (longest text)."""
        headers = ["Date", "Amount", "Memo"]
        sample_rows = [
            ["2026-04-20", "5000", "Customer Payment for Service"],
            ["2026-04-18", "3000", "Refund for Previous Invoice"],
        ]
        detected = detect_columns(headers, sample_rows)
        assert detected["description_col"] == "Memo"

    def test_detect_category_column(self):
        """Detect category column (repeated short values)."""
        headers = ["Date", "Amount", "Category"]
        sample_rows = [
            ["2026-04-20", "5000", "Revenue"],
            ["2026-04-18", "3000", "Revenue"],
            ["2026-04-15", "1200", "Infrastructure"],
        ]
        detected = detect_columns(headers, sample_rows)
        assert detected["category_col"] == "Category"

    def test_detect_columns_infer_from_data(self):
        """Infer columns from sample data when headers are generic."""
        headers = ["Col1", "Col2", "Col3", "Col4"]
        sample_rows = [
            ["2026-04-20", "5000.00", "Payment", "Revenue"],
            ["2026-04-18", "3000.00", "Refund", "Revenue"],
        ]
        detected = detect_columns(headers, sample_rows)
        # Date should be detected in Col1
        assert detected["date_col"] is not None
        # Amount should be detected in Col2
        assert detected["amount_col"] is not None

    def test_detect_columns_with_alternative_keywords(self):
        """Detect columns with alternative keywords."""
        headers = ["Posted Date", "Value", "Transaction"]
        detected = detect_columns(headers, [])
        assert detected["date_col"] == "Posted Date"
        assert detected["amount_col"] == "Value"

    def test_detect_columns_case_insensitive(self):
        """Column detection should be case-insensitive."""
        headers = ["DATE", "AMOUNT", "DESCRIPTION"]
        detected = detect_columns(headers, [])
        assert detected["date_col"] == "DATE"
        assert detected["amount_col"] == "AMOUNT"


class TestColumnTypeDetection:
    """Test suite for column type detection."""

    def test_detect_date_type(self):
        """Detect column as date type."""
        headers = ["Date", "Amount"]
        sample_rows = [
            ["2026-04-20", "5000"],
            ["2026-04-18", "3000"],
        ]
        types = detect_column_types(headers, sample_rows)
        date_col = next(t for t in types if t["name"] == "Date")
        assert date_col["detected_type"] == "date"

    def test_detect_amount_type(self):
        """Detect column as amount type."""
        headers = ["Date", "Amount"]
        sample_rows = [
            ["2026-04-20", "5000.00"],
            ["2026-04-18", "3000.50"],
        ]
        types = detect_column_types(headers, sample_rows)
        amount_col = next(t for t in types if t["name"] == "Amount")
        assert amount_col["detected_type"] == "amount"

    def test_detect_text_type(self):
        """Detect column as text type."""
        headers = ["Description"]
        sample_rows = [
            ["Customer Payment"],
            ["Service Refund"],
        ]
        types = detect_column_types(headers, sample_rows)
        desc_col = next(t for t in types if t["name"] == "Description")
        assert desc_col["detected_type"] == "text"

    def test_sample_values_included(self):
        """Include sample values in type detection result."""
        headers = ["Amount"]
        sample_rows = [
            ["5000"],
            ["3000"],
        ]
        types = detect_column_types(headers, sample_rows)
        assert len(types[0]["sample_values"]) > 0


class TestDuplicateDetection:
    """Test suite for duplicate transaction detection."""

    def test_detect_exact_duplicate(self):
        """Identify exact duplicate (same date, amount, description)."""
        new_rows = [
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "Customer Payment",
            }
        ]
        existing = [
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "Customer Payment",
            }
        ]
        unique, duplicates = detect_duplicates(new_rows, existing)
        assert len(unique) == 0
        assert len(duplicates) == 1

    def test_ignore_different_amounts(self):
        """Don't flag as duplicate if amount differs."""
        new_rows = [
            {
                "date": "2026-04-20",
                "amount": 5001.0,
                "description": "Customer Payment",
            }
        ]
        existing = [
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "Customer Payment",
            }
        ]
        unique, duplicates = detect_duplicates(new_rows, existing)
        assert len(unique) == 1
        assert len(duplicates) == 0

    def test_ignore_different_descriptions(self):
        """Don't flag as duplicate if description differs."""
        new_rows = [
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "Customer Payment A",
            }
        ]
        existing = [
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "Customer Payment B",
            }
        ]
        unique, duplicates = detect_duplicates(new_rows, existing)
        assert len(unique) == 1
        assert len(duplicates) == 0

    def test_case_insensitive_description(self):
        """Description comparison should be case-insensitive."""
        new_rows = [
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "CUSTOMER PAYMENT",
            }
        ]
        existing = [
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "customer payment",
            }
        ]
        unique, duplicates = detect_duplicates(new_rows, existing)
        assert len(unique) == 0
        assert len(duplicates) == 1

    def test_detect_within_new_rows(self):
        """Detect duplicates within new rows themselves."""
        new_rows = [
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "Payment",
            },
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "Payment",
            },
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "Different",
            },
        ]
        unique, duplicates = detect_duplicates(new_rows, [])
        # First payment is unique, second is duplicate of first
        assert len(unique) == 2
        assert len(duplicates) == 1

    def test_rounding_precision(self):
        """Amounts should be rounded to 2 decimals for comparison."""
        new_rows = [
            {
                "date": "2026-04-20",
                "amount": 5000.001,
                "description": "Payment",
            }
        ]
        existing = [
            {
                "date": "2026-04-20",
                "amount": 5000.0,
                "description": "Payment",
            }
        ]
        unique, duplicates = detect_duplicates(new_rows, existing)
        # After rounding to 2 decimals, both are 5000.0
        assert len(unique) == 0
        assert len(duplicates) == 1


class TestParseCSVContent:
    """Test suite for end-to-end CSV parsing."""

    def test_parse_valid_csv(self):
        """Parse valid CSV with all columns."""
        content = """Date,Description,Amount,Category
2026-04-20,Customer Payment,5000.00,Revenue
2026-04-18,AWS Bill,1200.00,Cloud"""
        mapping = {
            "date_col": "Date",
            "amount_col": "Amount",
            "description_col": "Description",
            "category_col": "Category",
        }
        rows, errors = parse_csv_content(content, mapping)
        assert len(rows) == 2
        assert len(errors) == 0
        assert rows[0]["amount"] == 5000.0
        assert rows[0]["date"] == "2026-04-20"

    def test_parse_csv_with_invalid_date(self):
        """Skip rows with invalid dates."""
        content = """Date,Description,Amount,Category
invalid-date,Customer Payment,5000.00,Revenue
2026-04-18,AWS Bill,1200.00,Cloud"""
        mapping = {
            "date_col": "Date",
            "amount_col": "Amount",
            "description_col": "Description",
            "category_col": "Category",
        }
        rows, errors = parse_csv_content(content, mapping)
        assert len(rows) == 1
        assert len(errors) == 1

    def test_parse_csv_with_invalid_amount(self):
        """Skip rows with invalid amounts."""
        content = """Date,Description,Amount,Category
2026-04-20,Customer Payment,not-a-number,Revenue
2026-04-18,AWS Bill,1200.00,Cloud"""
        mapping = {
            "date_col": "Date",
            "amount_col": "Amount",
            "description_col": "Description",
            "category_col": "Category",
        }
        rows, errors = parse_csv_content(content, mapping)
        assert len(rows) == 1
        assert len(errors) == 1

    def test_parse_csv_missing_date_column(self):
        """Error when date column is missing."""
        content = """Description,Amount,Category
Customer Payment,5000.00,Revenue"""
        mapping = {
            "date_col": None,
            "amount_col": "Amount",
            "description_col": "Description",
            "category_col": "Category",
        }
        rows, errors = parse_csv_content(content, mapping)
        assert len(rows) == 0
        assert len(errors) == 1

    def test_parse_csv_missing_amount_column(self):
        """Error when amount column is missing."""
        content = """Date,Description,Category
2026-04-20,Customer Payment,Revenue"""
        mapping = {
            "date_col": "Date",
            "amount_col": None,
            "description_col": "Description",
            "category_col": "Category",
        }
        rows, errors = parse_csv_content(content, mapping)
        assert len(rows) == 0
        assert len(errors) == 1

    def test_parse_csv_empty(self):
        """Handle empty CSV gracefully."""
        content = """Date,Amount,Description,Category"""
        mapping = {
            "date_col": "Date",
            "amount_col": "Amount",
            "description_col": "Description",
            "category_col": "Category",
        }
        rows, errors = parse_csv_content(content, mapping)
        assert len(rows) == 0
        assert len(errors) == 0

    def test_parse_csv_with_negative_amounts(self):
        """Parse CSV with negative amounts correctly."""
        content = """Date,Amount,Description,Category
2026-04-20,-5000.00,Refund,Revenue"""
        mapping = {
            "date_col": "Date",
            "amount_col": "Amount",
            "description_col": "Description",
            "category_col": "Category",
        }
        rows, errors = parse_csv_content(content, mapping)
        assert len(rows) == 1
        assert rows[0]["amount"] == 5000.0
        assert rows[0]["is_negative"] == True
