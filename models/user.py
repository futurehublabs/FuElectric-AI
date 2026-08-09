from pydantic import BaseModel, Field, EmailStr


class User(BaseModel):
    user_id: str = Field(
        ...,
        min_length=3,
        max_length=30
    )

    username: str = Field(
        ...,
        min_length=3,
        max_length=30
    )

    email: EmailStr

    password: str = Field(
        ...,
        min_length=8,
        max_length=100
    )

    role: str = "Viewer"