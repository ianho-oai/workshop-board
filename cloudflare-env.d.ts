declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    OPENAI_API_KEY?: string;
    ADMIN_PASSWORD?: string;
    OPENAI_MODEL?: string;
    BUCKET?: R2Bucket;
  }
}
