from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Dict, Any, Optional
import uvicorn

# Initialize FastAPI application
app = FastAPI(
    title="Talented - Authentication Service",
    description="Backend API for managing user signups and profiles",
    version="1.0.0"
)

# Enable CORS (Cross-Origin Resource Sharing)
# In production, specify your explicit front-end domain inside 'allow_origins'
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development ease; restrict in production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (POST, GET, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)

# ----------------------------------------------------
# Request and Response Schemas (Pydantic Models)
# ----------------------------------------------------

class UserSignUpRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50, description="User's biological or prefered first name")
    last_name: str = Field(..., min_length=1, max_length=50, description="User's biological or prefered last name")
    email: EmailStr = Field(..., description="A valid email address for account confirmation")
    username: str = Field(..., min_length=3, max_length=30, pattern="^[a-zA-Z0-dict_keys0-9_.-]+$")
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    confirm_password: str = Field(..., description="Must match the password field exactly")

    @validator("confirm_password")
    def passwords_match(cls, v: str, values: Dict[str, Any]) -> str:
        if "password" in values and v != values["password"]:
            raise ValueError("passwords do not match")
        return v

    @validator("username")
    def validate_username(cls, v: str) -> str:
        # Prevent reserved usernames if needed
        reserved = {"admin", "root", "superuser", "talented", "api"}
        if v.lower() in reserved:
            raise ValueError("this username is reserved and cannot be registered")
        return v


class UserSignUpResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    user_details: dict


# ----------------------------------------------------
# Mock Database and Authentication Logic
# ----------------------------------------------------

# In-memory user database stores registered credentials
# Replace this with connection to your actual SQL or NoSQL database (PostgreSQL, MongoDB, etc.)
MOCK_USER_DB = []


@app.post(
    "/api/signup", 
    response_model=UserSignUpResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
async def signup_user(payload: UserSignUpRequest):
    """
    Registers a new user record in the system.
    
    Performs standard client validation:
    1. Check if the email address is already registered
    2. Check if the username is already taken
    3. Password complexity / match validations (already verified in Pydantic schema)
    """
    
    # 1. Email existence check
    for user in MOCK_USER_DB:
        if user["email"].lower() == payload.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )
            
    # 2. Username existence check
    for user in MOCK_USER_DB:
        if user["username"].lower() == payload.username.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username is already taken. Please select another one."
            )

    # 3. Secure password hashing (In production, use bcrypt or passlib)
    # from passlib.context import CryptContext
    # pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    # hashed_password = pwd_context.hash(payload.password)
    hashed_password_mock = f"sha256_mock_hash_{payload.password[::-1]}" # ONLY for demonstration

    new_user_id = len(MOCK_USER_DB) + 101 # starting ID offset
    
    new_user_record = {
        "id": new_user_id,
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "email": payload.email,
        "username": payload.username,
        "hashed_password": hashed_password_mock
    }
    
    # Capitalize details to persist in DB
    MOCK_USER_DB.append(new_user_record)
    
    return UserSignUpResponse(
        success=True,
        message="Account created successfully! Welcome to Talented.",
        user_id=new_user_id,
        user_details={
            "first_name": payload.first_name,
            "last_name": payload.last_name,
            "email": payload.email,
            "username": payload.username
        }
    )


@app.get("/api/health", summary="API Health status check")
async def health_check():
    return {"status": "healthy", "service": "talented-api"}


if __name__ == "__main__":
    # Runs the local development server on port 8000
    uvicorn.run("main.py:app", host="0.0.0.0", port=8000, reload=True)
