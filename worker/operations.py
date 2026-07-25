"""Supported AI task operations.

Kept intentionally simple/synchronous string ops per the assignment spec,
but isolated in their own module so swapping in real model calls later
(e.g. calling an LLM API) only touches this file.
"""


class UnsupportedOperationError(Exception):
    pass


def run_operation(operation: str, text: str) -> str:
    if operation == "uppercase":
        return text.upper()
    if operation == "lowercase":
        return text.lower()
    if operation == "reverse":
        return text[::-1]
    if operation == "word_count":
        return str(len(text.split()))

    raise UnsupportedOperationError(f"Unsupported operation: {operation}")
