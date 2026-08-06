"""
Data Ingestion Engine — CSV, Excel, JSON customer data.

Parses structured files, validates, normalizes, and prepares records
for embedding and storage in ChromaDB.
"""
import os
import json
import hashlib
import logging
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class CustomerRecord:
    """A single customer/claims/policy record for embedding."""
    record_id: str
    customer_id: str = ""
    customer_name: str = ""
    policy_number: str = ""
    insurance_type: str = ""
    claim_id: str = ""
    source_file: str = ""
    upload_timestamp: str = ""
    searchable_text: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)
    content_hash: str = ""


class DataIngester:
    """Ingest CSV, Excel, and JSON files into structured records."""

    SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json"}

    def ingest_file(self, filepath: str) -> List[CustomerRecord]:
        """
        Parse a file and return a list of CustomerRecords.
        Supports CSV, Excel (.xlsx), and JSON.
        """
        ext = os.path.splitext(filepath)[1].lower()
        filename = os.path.basename(filepath)
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ")

        if ext == ".csv":
            return self._ingest_csv(filepath, filename, timestamp)
        elif ext in (".xlsx", ".xls"):
            return self._ingest_excel(filepath, filename, timestamp)
        elif ext == ".json":
            return self._ingest_json(filepath, filename, timestamp)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    def _ingest_csv(self, filepath: str, filename: str, timestamp: str) -> List[CustomerRecord]:
        """Parse CSV file."""
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas is required: pip install pandas")

        df = pd.read_csv(filepath, dtype=str).fillna("")
        return self._dataframe_to_records(df, filename, timestamp)

    def _ingest_excel(self, filepath: str, filename: str, timestamp: str) -> List[CustomerRecord]:
        """Parse Excel file."""
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas is required: pip install pandas openpyxl")

        df = pd.read_excel(filepath, dtype=str, engine="openpyxl").fillna("")
        return self._dataframe_to_records(df, filename, timestamp)

    def _ingest_json(self, filepath: str, filename: str, timestamp: str) -> List[CustomerRecord]:
        """Parse JSON file (array of objects or single object)."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, dict):
            data = [data]

        records = []
        for i, item in enumerate(data):
            record = self._dict_to_record(item, i, filename, timestamp)
            records.append(record)

        logger.info(f"Ingested {len(records)} records from {filename}")
        return records

    def _dataframe_to_records(self, df, filename: str, timestamp: str) -> List[CustomerRecord]:
        """Convert a pandas DataFrame to CustomerRecords."""
        # Normalize column names
        df.columns = [self._normalize_column_name(c) for c in df.columns]

        records = []
        for i, row in df.iterrows():
            row_dict = row.to_dict()
            record = self._dict_to_record(row_dict, i, filename, timestamp)
            records.append(record)

        logger.info(f"Ingested {len(records)} records from {filename}")
        return records

    def _dict_to_record(self, data: dict, index: int, filename: str, timestamp: str) -> CustomerRecord:
        """Convert a dict to a CustomerRecord with field mapping."""
        # Field mapping — try common variations
        customer_id = self._extract_field(data, [
            "customer_id", "customerid", "cust_id", "id", "member_id", "insured_id"
        ])
        customer_name = self._extract_field(data, [
            "customer_name", "name", "full_name", "insured_name", "member_name",
            "policyholder", "policy_holder"
        ])
        policy_number = self._extract_field(data, [
            "policy_number", "policy_no", "policy_id", "policyno", "policy"
        ])
        insurance_type = self._extract_field(data, [
            "insurance_type", "type", "product", "plan", "coverage_type",
            "policy_type", "product_name"
        ])
        claim_id = self._extract_field(data, [
            "claim_id", "claimid", "claim_no", "claim_number", "claim"
        ])

        # Build searchable text from all fields
        searchable_parts = []
        for key, value in data.items():
            if value and str(value).strip():
                searchable_parts.append(f"{key}: {value}")
        searchable_text = " | ".join(searchable_parts)

        # Content hash for deduplication
        hash_input = f"{customer_id}_{policy_number}_{claim_id}_{searchable_text}"
        c_hash = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()

        record_id = f"{os.path.splitext(filename)[0]}_rec{index}"

        return CustomerRecord(
            record_id=record_id,
            customer_id=str(customer_id),
            customer_name=str(customer_name),
            policy_number=str(policy_number),
            insurance_type=str(insurance_type),
            claim_id=str(claim_id),
            source_file=filename,
            upload_timestamp=timestamp,
            searchable_text=searchable_text,
            raw_data=data,
            content_hash=c_hash,
        )

    def _extract_field(self, data: dict, candidates: List[str]) -> str:
        """Extract a field value from a dict using candidate key names."""
        for key in candidates:
            normalized = self._normalize_column_name(key)
            for actual_key in data:
                if self._normalize_column_name(actual_key) == normalized:
                    val = data[actual_key]
                    if val and str(val).strip():
                        return str(val).strip()
        return ""

    @staticmethod
    def _normalize_column_name(name: str) -> str:
        """Normalize a column name: lowercase, strip, replace spaces/dashes with underscores."""
        import re
        name = str(name).lower().strip()
        name = re.sub(r'[\s\-\.]+', '_', name)
        name = re.sub(r'[^\w]', '', name)
        return name


# Singleton
_ingester = None

def get_data_ingester() -> DataIngester:
    global _ingester
    if _ingester is None:
        _ingester = DataIngester()
    return _ingester
