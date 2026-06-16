import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, String, Float, Integer,
    DateTime, Text, ForeignKey, Boolean, JSON
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DB_PATH = os.getenv("DB_PATH", "/tmp/montageai.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class User(Base):
    __tablename__ = "users"
    id          = Column(String, primary_key=True)
    email       = Column(String, unique=True, nullable=False, index=True)
    name        = Column(String, nullable=False)
    password    = Column(String, nullable=False)
    plan        = Column(String, default="free")   # free | pro | business
    created_at  = Column(DateTime, default=datetime.utcnow)
    projects    = relationship("Project", back_populates="user", cascade="all, delete")


class Project(Base):
    __tablename__ = "projects"
    id          = Column(String, primary_key=True)
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    title       = Column(String, nullable=False)
    source_url  = Column(String)
    thumbnail   = Column(String)
    duration    = Column(Float, default=0)
    status      = Column(String, default="draft")   # draft | processing | ready | error
    edit_data   = Column(JSON, default=dict)        # timeline EDL (edit decision list)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user        = relationship("User", back_populates="projects")
    clips       = relationship("Clip", back_populates="project", cascade="all, delete")
    jobs        = relationship("Job", back_populates="project", cascade="all, delete")


class Clip(Base):
    __tablename__ = "clips"
    id              = Column(String, primary_key=True)
    project_id      = Column(String, ForeignKey("projects.id"), nullable=False)
    title           = Column(String)
    hook            = Column(Text)
    score           = Column(Float, default=0)
    start_time      = Column(Float, default=0)
    end_time        = Column(Float, default=0)
    duration        = Column(Float, default=0)
    file_path       = Column(String)
    thumbnail_path  = Column(String)
    subtitles_path  = Column(String)
    has_subtitles   = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    project         = relationship("Project", back_populates="clips")


class Job(Base):
    __tablename__ = "jobs"
    id          = Column(String, primary_key=True)
    project_id  = Column(String, ForeignKey("projects.id"), nullable=False)
    type        = Column(String)   # generate | subtitles | silence | autocrop | enhance | export
    status      = Column(String, default="pending")  # pending | running | done | error
    progress    = Column(Integer, default=0)         # 0-100
    step        = Column(String, default="")
    result      = Column(JSON)
    error       = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    project     = relationship("Project", back_populates="jobs")


def create_tables():
    Base.metadata.create_all(bind=engine)
