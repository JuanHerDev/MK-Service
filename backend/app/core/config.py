from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "MK Service"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    database_url: str
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    cors_origins: str = "http://localhost:3000"

    # Security
    force_https: bool = False  # True in production behind TLS terminator
    rate_limit_auth_per_minute: int = 20
    rate_limit_api_per_minute: int = 120
    max_upload_bytes: int = 2 * 1024 * 1024  # 2 MiB
    enable_api_docs: bool = True  # set False in production

    # If true, POST /campaigns/{id}/run enqueues RQ job (requires worker).
    # If false or Redis is down, runs probes in-process.
    campaign_async: bool = True

    # Payload + report storage
    storage_path: str = "storage"
    # local | s3  (s3 works with AWS, Cloudflare R2, MinIO via endpoint_url)
    storage_backend: str = "local"
    s3_bucket: str | None = None
    s3_region: str = "auto"
    s3_endpoint_url: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_prefix: str = "mk-service/"

    # Cold-start wake for companion lab on Render (comma-separated bases or /health URLs)
    lab_wake_url: str = "https://mk-service-lab.onrender.com/health"
    lab_wake_min_interval_seconds: int = 60
    lab_wake_timeout_seconds: float = 15.0
    lab_wake_wait_seconds: float = 0.0  # e.g. 45 to wait for Render cold start
    lab_wake_host_substring: str = "onrender.com,localhost,127.0.0.1,mk-rag,rag-lab,rag_lab"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
