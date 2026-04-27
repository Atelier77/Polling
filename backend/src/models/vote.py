from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.database.connection import Base

class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    
    poll_id = Column(Integer, ForeignKey("polls.id", ondelete="CASCADE"), nullable=False)
    option_id = Column(Integer, ForeignKey("options.id", ondelete="CASCADE"), nullable=False)
    
    student_id = Column(String, ForeignKey("users.student_id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45), nullable=True)
    
    poll = relationship("Poll", back_populates="votes")
    option = relationship("Option", back_populates="votes_entries")
    
    user = relationship("User", back_populates="votes")

    __table_args__ = (
        UniqueConstraint('poll_id', 'student_id', name='uq_vote_poll_student'),
    )

from pydantic import BaseModel, ConfigDict
from datetime import datetime

class VoteBase(BaseModel):
    poll_id: int
    option_id: int
    student_id: str

class VoteCreate(VoteBase):
    pass

class VoteResponse(VoteBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)