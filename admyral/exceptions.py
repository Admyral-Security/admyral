class AdmyralError(Exception):
    """Base for all Admyral exceptions."""

    @property
    def cause(self) -> BaseException | None:
        """Cause of the exception.

        This is the same as ``Exception.__cause__``.
        """
        return self.__cause__


class AdmyralFailureError(AdmyralError):
    """Base for runtime failures during workflow/action execution."""

    def __init__(
        self,
        message: str,
    ) -> None:
        super().__init__(message)
        self._message = message

    @property
    def message(self) -> str:
        """Message."""
        return self._message


class NonRetryableActionError(AdmyralFailureError):
    """Raised when an action is not retryable."""

    def __init__(
        self,
        message: str,
    ) -> None:
        super().__init__(message)


class RetryableActionError(AdmyralFailureError):
    """Raised when an action is retryable."""

    def __init__(
        self,
        message: str,
    ) -> None:
        super().__init__(message)
