from fastapi import HTTPException, status


class ResourceGoneException(HTTPException):

    def __init__(self, detail: str = "Ресурс был удалён"):
        super().__init__(status_code=status.HTTP_410_GONE, detail=detail)


class InsufficientPermissionsException(HTTPException):

    def __init__(self, detail: str = "Доступ запрещён"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ValidationException(HTTPException):

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail
        )
