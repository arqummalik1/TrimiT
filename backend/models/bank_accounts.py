from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class BankAccountCreate(BaseModel):
    account_name: str = Field(..., description="Beneficiary Name on the bank account")
    account_number: str = Field(..., description="Full bank account number")
    ifsc_code: str = Field(..., description="Bank IFSC code")

class BankAccountResponse(BaseModel):
    id: UUID
    salon_id: UUID
    account_name: str
    account_number_last4: str
    ifsc_code: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
