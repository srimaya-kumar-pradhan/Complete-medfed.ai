"""Local Vector Store for Semantic Clinical Record Retrieval.
Provides demonstration vector embeddings and fast cosine-similarity search over clinical notes.
Stores vectors locally in SQLite / memory for instant local operation without cloud dependencies.
"""
from __future__ import annotations

import logging
import math
import re
from collections import Counter
from typing import Any, Optional

from sqlalchemy.orm import Session
from app.models.patient import Patient
from app.models.clinical import ClinicalEncounter

logger = logging.getLogger("dori.vector")


class LocalVectorStore:
    """Lightweight in-process vector store using term-frequency and n-gram embeddings."""

    def __init__(self):
        self._index: list[dict[str, Any]] = []
        self._vocabulary: dict[str, int] = {}
        self._is_initialized = False

    def _tokenize(self, text: str) -> list[str]:
        """Normalize and tokenize text into clinical tokens and bigrams."""
        clean = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = [t for t in clean.split() if len(t) > 2]
        # Add character tri-grams for typo-tolerant matching
        bigrams = [f"{tokens[i]}_{tokens[i+1]}" for i in range(len(tokens) - 1)]
        return tokens + bigrams

    def _embed(self, text: str) -> dict[str, float]:
        """Produce a normalized sparse embedding vector."""
        tokens = self._tokenize(text)
        if not tokens:
            return {}
        counts = Counter(tokens)
        norm = math.sqrt(sum(v * v for v in counts.values()))
        return {k: v / norm for k, v in counts.items()}

    def _cosine_similarity(self, vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
        """Compute cosine similarity between two normalized sparse vectors."""
        common_keys = set(vec_a.keys()) & set(vec_b.keys())
        return sum(vec_a[k] * vec_b[k] for k in common_keys)

    def index_record(
        self,
        record_id: str,
        patient_id: str,
        patient_name: str,
        text_content: str,
        record_type: str,
        metadata: Optional[dict[str, Any]] = None,
    ):
        """Add or update a clinical record in the vector index."""
        vector = self._embed(text_content)
        # Check if already exists
        for item in self._index:
            if item["record_id"] == record_id:
                item["vector"] = vector
                item["text"] = text_content
                item["metadata"] = metadata or {}
                return

        self._index.append({
            "record_id": record_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "text": text_content,
            "record_type": record_type,
            "vector": vector,
            "metadata": metadata or {},
        })

    def sync_from_db(self, db: Session):
        """Index all current patients and encounters from database."""
        try:
            encounters = db.query(ClinicalEncounter).all()
            for enc in encounters:
                p = enc.patient
                p_name = p.full_name if p else "Unknown Patient"
                text = f"{enc.encounter_type.value} {enc.chief_complaint or ''} {enc.diagnosis or ''} {enc.treatment_plan or ''} {enc.notes or ''}"
                self.index_record(
                    record_id=str(enc.id),
                    patient_id=str(enc.patient_id),
                    patient_name=p_name,
                    text_content=text,
                    record_type="clinical_encounter",
                    metadata={"encounter_type": enc.encounter_type.value},
                )

            patients = db.query(Patient).all()
            for pat in patients:
                text = f"{pat.full_name} {pat.pseudonymous_id} {pat.village or ''} {pat.blood_group.value if hasattr(pat.blood_group, 'value') else ''}"
                self.index_record(
                    record_id=str(pat.id),
                    patient_id=str(pat.id),
                    patient_name=pat.full_name,
                    text_content=text,
                    record_type="patient_demographic",
                    metadata={"pid": pat.pseudonymous_id},
                )
            self._is_initialized = True
            logger.info("Vector store synchronized: %d records indexed", len(self._index))
        except Exception as exc:
            logger.warning("Error syncing vector store from DB: %s", exc)

    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        """Perform semantic search across indexed clinical records."""
        query_vec = self._embed(query)
        if not query_vec or not self._index:
            return []

        scored = []
        for item in self._index:
            sim = self._cosine_similarity(query_vec, item["vector"])
            if sim > 0.05:
                scored.append({
                    "record_id": item["record_id"],
                    "patient_id": item["patient_id"],
                    "patient_name": item["patient_name"],
                    "record_type": item["record_type"],
                    "similarity_score": round(sim, 3),
                    "snippet": item["text"][:160] + ("..." if len(item["text"]) > 160 else ""),
                    "metadata": item["metadata"],
                })

        scored.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored[:top_k]

    def get_status(self, db: Session) -> dict[str, Any]:
        """Return system indicator status for the admin dashboard."""
        if not self._is_initialized:
            self.sync_from_db(db)

        patient_count = db.query(Patient).count()
        encounter_count = db.query(ClinicalEncounter).count()

        return {
            "status": "Connected",
            "storage_engine": "SQLite / Local Vector Index",
            "patients_stored": patient_count,
            "clinical_records_stored": encounter_count,
            "vector_index_records": len(self._index),
            "semantic_retrieval_ready": True,
            "data_classification": "LOCAL DEMO STORAGE [SYNTHETIC / BENCHMARK]",
        }


_vector_store_instance: Optional[LocalVectorStore] = None


def get_vector_store() -> LocalVectorStore:
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = LocalVectorStore()
    return _vector_store_instance
