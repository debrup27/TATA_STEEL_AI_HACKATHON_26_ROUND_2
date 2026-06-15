from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.rag.retrieval import (
    _document_where_clause,
    _title_matches,
    retrieve_for_collections,
)


class RetrievalFilterTests(SimpleTestCase):
    def test_document_where_clause_single(self):
        self.assertEqual(
            _document_where_clause(["abc-123"]),
            {"document_id": {"$eq": "abc-123"}},
        )

    def test_document_where_clause_multiple(self):
        self.assertEqual(
            _document_where_clause(["a", "b"]),
            {"document_id": {"$in": ["a", "b"]}},
        )

    def test_title_matches_rejects_unrelated_content_overlap(self):
        hit = {
            "properties": {
                "title": "Other SOP",
                "content": "ISO 4406 hydraulic oil cleanliness code 16/14/11",
            }
        }
        self.assertFalse(
            _title_matches(hit, {"iso 10816-3 vibration limits"}, document_ids=set())
        )

    def test_title_matches_accepts_document_id(self):
        hit = {"properties": {"document_id": "doc-1", "title": "Anything"}}
        self.assertTrue(
            _title_matches(hit, set(), document_ids={"doc-1"})
        )

    @patch("apps.rag.retrieval._hybrid_search")
    @patch("apps.rag.retrieval._resolve_document_ids")
    def test_retrieve_for_collections_scopes_hybrid_search_by_document_id(
        self, mock_resolve, mock_hybrid
    ):
        mock_resolve.return_value = ["doc-a"]
        mock_hybrid.return_value = [
            {"properties": {"title": "Right Doc", "document_id": "doc-a", "content": "y"}},
        ]

        hits = retrieve_for_collections(
            "bearing vibration",
            ["sop"],
            document_titles=["Right Doc"],
            document_ids=["doc-a"],
        )

        self.assertEqual(len(hits), 1)
        mock_hybrid.assert_called_once()
        self.assertEqual(mock_hybrid.call_args.kwargs["document_ids"], ["doc-a"])

    @patch("apps.rag.retrieval._hybrid_search")
    @patch("apps.rag.retrieval._resolve_document_ids")
    def test_retrieve_for_collections_title_only_filter_drops_unrelated_hits(
        self, mock_resolve, mock_hybrid
    ):
        mock_resolve.return_value = []
        mock_hybrid.return_value = [
            {"properties": {"title": "Wrong Doc", "content": "ISO 4406 code"}},
            {"properties": {"title": "Right Doc", "content": "bearing steps"}},
        ]

        hits = retrieve_for_collections(
            "bearing vibration",
            ["sop"],
            document_titles=["Right Doc"],
        )

        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0]["properties"]["title"], "Right Doc")

    @patch("apps.rag.retrieval._hybrid_search")
    @patch("apps.rag.retrieval._resolve_document_ids")
    def test_retrieve_for_collections_title_only_returns_empty_without_fallback(
        self, mock_resolve, mock_hybrid
    ):
        mock_resolve.return_value = []
        mock_hybrid.return_value = [
            {"properties": {"title": "Wrong Doc", "content": "ISO 4406 code"}},
        ]

        hits = retrieve_for_collections(
            "bearing vibration",
            ["sop"],
            document_titles=["Right Doc"],
        )

        self.assertEqual(hits, [])
