const { sql } = require('@vercel/postgres');

const API_SECRET = process.env.API_SECRET_KEY || 'your-secret-key';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Tự động tạo bảng (giữ nguyên)
  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image TEXT,
      source_url TEXT,
      tags TEXT[],
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Xử lý POST (Đăng bài mới - giữ nguyên)
  if (req.method === 'POST') {
    const { title, content, image, source_url, tags } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });
    const result = await sql`
      INSERT INTO posts (title, content, image, source_url, tags)
      VALUES (${title}, ${content}, ${image || ''}, ${source_url || ''}, ${tags || []})
      RETURNING id, title, created_at;
    `;
    return res.status(201).json(result.rows[0]);
  }

  // XỬ LÝ GET (TỐI ƯU TẠI ĐÂY)
  if (req.method === 'GET') {
    const { id } = req.query;

    if (id) {
      // 1. Nếu có ID: Chỉ lấy DUY NHẤT bài đó (CỰC NHANH)
      const { rows } = await sql`SELECT * FROM posts WHERE id = ${id} LIMIT 1;`;
      return res.status(200).json(rows[0] || null);
    } else {
      // 2. Nếu không có ID: Lấy danh sách (Bỏ qua 'content' để load siêu tốc)
      const { rows } = await sql`
        SELECT id, title, image, created_at, tags 
        FROM posts ORDER BY created_at DESC LIMIT 50;
      `;
      return res.status(200).json(rows);
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
