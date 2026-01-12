import sql from "mssql";

const config: sql.config = {
  server: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "1433", 10),
  database: process.env.DB_NAME || "MyAppDatabase",
  user: process.env.DB_USER || "MyAppUser",
  password: process.env.DB_PASSWORD || "MyAppSecretPassword!123",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

export async function query<T>(
  sqlQuery: string,
  params?: Record<string, unknown>
): Promise<sql.IResult<T>> {
  const conn = await getConnection();
  const request = conn.request();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }

  return request.query<T>(sqlQuery);
}

export { sql };
