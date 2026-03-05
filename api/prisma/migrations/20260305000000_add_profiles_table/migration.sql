-- Create profiles table (mirrors Supabase profiles for local dev)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  bio TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT
);

-- Seed profiles for local dev
INSERT INTO profiles (id, username, bio, avatar_url) VALUES
  ('aaaaaaaa-0001-4000-8000-000000000001', 'alice_cs', 'CS student interested in systems programming and algorithms.', 'https://api.dicebear.com/9.x/thumbs/svg?seed=alice_cs'),
  ('aaaaaaaa-0002-4000-8000-000000000002', 'bob_math', 'Math enthusiast exploring ML foundations.', 'https://api.dicebear.com/9.x/thumbs/svg?seed=bob_math'),
  ('aaaaaaaa-0003-4000-8000-000000000003', 'carol_ml', 'Deep learning researcher.', 'https://api.dicebear.com/9.x/thumbs/svg?seed=carol_ml'),
  ('aaaaaaaa-0004-4000-8000-000000000004', 'dave_sys', 'DevOps and distributed systems engineer.', 'https://api.dicebear.com/9.x/thumbs/svg?seed=dave_sys'),
  ('aaaaaaaa-0005-4000-8000-000000000005', 'eve_acad', 'Academic focused on type theory and cryptography.', 'https://api.dicebear.com/9.x/thumbs/svg?seed=eve_acad')
ON CONFLICT (id) DO NOTHING;

-- Seed boards
INSERT INTO "Board" (id, name, description, "isPublic", "userId", "createdAt") VALUES
  ('bbbbbbbb-0001-4000-8000-000000000001', 'Systems Programming', 'Low-level programming, OS concepts, and C/Rust resources', true, 'aaaaaaaa-0001-4000-8000-000000000001', now()),
  ('bbbbbbbb-0002-4000-8000-000000000002', 'Algorithms & Data Structures', 'Competitive programming and algorithm design', true, 'aaaaaaaa-0001-4000-8000-000000000001', now()),
  ('bbbbbbbb-0004-4000-8000-000000000004', 'Linear Algebra for ML', NULL, true, 'aaaaaaaa-0002-4000-8000-000000000002', now()),
  ('bbbbbbbb-0005-4000-8000-000000000005', 'Deep Learning Papers', NULL, true, 'aaaaaaaa-0003-4000-8000-000000000003', now()),
  ('bbbbbbbb-0006-4000-8000-000000000006', 'Reinforcement Learning', NULL, true, 'aaaaaaaa-0003-4000-8000-000000000003', now()),
  ('bbbbbbbb-0007-4000-8000-000000000007', 'Distributed Systems', NULL, true, 'aaaaaaaa-0004-4000-8000-000000000004', now()),
  ('bbbbbbbb-0008-4000-8000-000000000008', 'DevOps & SRE', NULL, true, 'aaaaaaaa-0004-4000-8000-000000000004', now()),
  ('bbbbbbbb-0009-4000-8000-000000000009', 'Type Theory', NULL, true, 'aaaaaaaa-0005-4000-8000-000000000005', now()),
  ('bbbbbbbb-0010-4000-8000-000000000010', 'Cryptography', NULL, true, 'aaaaaaaa-0005-4000-8000-000000000005', now())
ON CONFLICT (id) DO NOTHING;

-- Seed resources
INSERT INTO "Resource" (id, url, title, tags, "userId", "createdAt") VALUES
  -- alice_cs: Systems Programming
  ('cccccccc-0001-4000-8000-000000000001', 'https://pages.cs.wisc.edu/~remzi/OSTEP/', 'Operating Systems: Three Easy Pieces', '{os,free-book,systems}', 'aaaaaaaa-0001-4000-8000-000000000001', now()),
  ('cccccccc-0002-4000-8000-000000000002', 'https://doc.rust-lang.org/book/', 'The Rust Programming Language', '{rust,systems,free-book}', 'aaaaaaaa-0001-4000-8000-000000000001', now()),
  ('cccccccc-0003-4000-8000-000000000003', 'https://beej.us/guide/bgnet/', 'Beej''s Guide to Network Programming', '{networking,c,sockets}', 'aaaaaaaa-0001-4000-8000-000000000001', now()),
  -- alice_cs: Algorithms
  ('cccccccc-0004-4000-8000-000000000004', 'https://cp-algorithms.com/', 'CP Algorithms', '{algorithms,competitive-programming,reference}', 'aaaaaaaa-0001-4000-8000-000000000001', now()),
  ('cccccccc-0005-4000-8000-000000000005', 'https://visualgo.net/', 'VisuAlgo - Visualising Algorithms', '{algorithms,visualization,interactive}', 'aaaaaaaa-0001-4000-8000-000000000001', now()),
  -- bob_math: Linear Algebra
  ('cccccccc-0006-4000-8000-000000000006', 'https://mml-book.github.io/', 'Mathematics for Machine Learning', '{linear-algebra,ml,free-book}', 'aaaaaaaa-0002-4000-8000-000000000002', now()),
  ('cccccccc-0007-4000-8000-000000000007', 'https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/', 'MIT 18.06SC Linear Algebra (Gilbert Strang)', '{linear-algebra,mit,course}', 'aaaaaaaa-0002-4000-8000-000000000002', now()),
  ('cccccccc-0008-4000-8000-000000000008', 'https://www.3blue1brown.com/topics/linear-algebra', 'Essence of Linear Algebra (3Blue1Brown)', '{linear-algebra,video,intuition}', 'aaaaaaaa-0002-4000-8000-000000000002', now()),
  -- carol_ml: Deep Learning
  ('cccccccc-0009-4000-8000-000000000009', 'https://arxiv.org/abs/1706.03762', 'Attention Is All You Need', '{transformers,deep-learning,paper}', 'aaaaaaaa-0003-4000-8000-000000000003', now()),
  ('cccccccc-0010-4000-8000-000000000010', 'https://karpathy.ai/zero-to-hero.html', 'Neural Networks: Zero to Hero (Karpathy)', '{deep-learning,tutorial,video}', 'aaaaaaaa-0003-4000-8000-000000000003', now()),
  ('cccccccc-0011-4000-8000-000000000011', 'https://www.deeplearningbook.org/', 'Deep Learning (Goodfellow et al.)', '{deep-learning,textbook,free-book}', 'aaaaaaaa-0003-4000-8000-000000000003', now()),
  -- carol_ml: Reinforcement Learning
  ('cccccccc-0012-4000-8000-000000000012', 'https://spinningup.openai.com/', 'OpenAI Spinning Up in Deep RL', '{rl,tutorial,openai}', 'aaaaaaaa-0003-4000-8000-000000000003', now()),
  ('cccccccc-0013-4000-8000-000000000013', 'https://huggingface.co/learn/deep-rl-course/', 'Hugging Face Deep RL Course', '{rl,course,hands-on}', 'aaaaaaaa-0003-4000-8000-000000000003', now()),
  -- dave_sys: Distributed Systems
  ('cccccccc-0014-4000-8000-000000000014', 'https://raft.github.io/', 'The Raft Consensus Algorithm', '{consensus,distributed-systems,visualization}', 'aaaaaaaa-0004-4000-8000-000000000004', now()),
  ('cccccccc-0015-4000-8000-000000000015', 'https://jepsen.io/analyses', 'Jepsen: Distributed Systems Safety Analyses', '{distributed-systems,testing,correctness}', 'aaaaaaaa-0004-4000-8000-000000000004', now()),
  ('cccccccc-0016-4000-8000-000000000016', 'https://dataintensive.net/', 'Designing Data-Intensive Applications', '{distributed-systems,databases,architecture}', 'aaaaaaaa-0004-4000-8000-000000000004', now()),
  -- dave_sys: DevOps & SRE
  ('cccccccc-0017-4000-8000-000000000017', 'https://sre.google/sre-book/table-of-contents/', 'Google SRE Book', '{sre,reliability,free-book}', 'aaaaaaaa-0004-4000-8000-000000000004', now()),
  ('cccccccc-0018-4000-8000-000000000018', 'https://12factor.net/', 'The Twelve-Factor App', '{devops,best-practices,architecture}', 'aaaaaaaa-0004-4000-8000-000000000004', now()),
  -- eve_acad: Type Theory
  ('cccccccc-0019-4000-8000-000000000019', 'https://homotopytypetheory.org/book/', 'Homotopy Type Theory', '{type-theory,hott,free-book}', 'aaaaaaaa-0005-4000-8000-000000000005', now()),
  ('cccccccc-0020-4000-8000-000000000020', 'https://softwarefoundations.cis.upenn.edu/', 'Software Foundations', '{type-theory,coq,formal-verification}', 'aaaaaaaa-0005-4000-8000-000000000005', now()),
  -- eve_acad: Cryptography
  ('cccccccc-0021-4000-8000-000000000021', 'https://cryptopals.com/', 'Cryptopals Crypto Challenges', '{cryptography,challenges,hands-on}', 'aaaaaaaa-0005-4000-8000-000000000005', now()),
  ('cccccccc-0022-4000-8000-000000000022', 'https://toc.cryptobook.us/', 'A Graduate Course in Applied Cryptography', '{cryptography,textbook,free-book}', 'aaaaaaaa-0005-4000-8000-000000000005', now())
ON CONFLICT (id) DO NOTHING;

-- Link resources to boards
INSERT INTO "BoardResource" ("boardId", "resourceId", "addedAt") VALUES
  -- alice: Systems Programming
  ('bbbbbbbb-0001-4000-8000-000000000001', 'cccccccc-0001-4000-8000-000000000001', now()),
  ('bbbbbbbb-0001-4000-8000-000000000001', 'cccccccc-0002-4000-8000-000000000002', now()),
  ('bbbbbbbb-0001-4000-8000-000000000001', 'cccccccc-0003-4000-8000-000000000003', now()),
  -- alice: Algorithms
  ('bbbbbbbb-0002-4000-8000-000000000002', 'cccccccc-0004-4000-8000-000000000004', now()),
  ('bbbbbbbb-0002-4000-8000-000000000002', 'cccccccc-0005-4000-8000-000000000005', now()),
  -- bob: Linear Algebra
  ('bbbbbbbb-0004-4000-8000-000000000004', 'cccccccc-0006-4000-8000-000000000006', now()),
  ('bbbbbbbb-0004-4000-8000-000000000004', 'cccccccc-0007-4000-8000-000000000007', now()),
  ('bbbbbbbb-0004-4000-8000-000000000004', 'cccccccc-0008-4000-8000-000000000008', now()),
  -- carol: Deep Learning
  ('bbbbbbbb-0005-4000-8000-000000000005', 'cccccccc-0009-4000-8000-000000000009', now()),
  ('bbbbbbbb-0005-4000-8000-000000000005', 'cccccccc-0010-4000-8000-000000000010', now()),
  ('bbbbbbbb-0005-4000-8000-000000000005', 'cccccccc-0011-4000-8000-000000000011', now()),
  -- carol: Reinforcement Learning
  ('bbbbbbbb-0006-4000-8000-000000000006', 'cccccccc-0012-4000-8000-000000000012', now()),
  ('bbbbbbbb-0006-4000-8000-000000000006', 'cccccccc-0013-4000-8000-000000000013', now()),
  -- dave: Distributed Systems
  ('bbbbbbbb-0007-4000-8000-000000000007', 'cccccccc-0014-4000-8000-000000000014', now()),
  ('bbbbbbbb-0007-4000-8000-000000000007', 'cccccccc-0015-4000-8000-000000000015', now()),
  ('bbbbbbbb-0007-4000-8000-000000000007', 'cccccccc-0016-4000-8000-000000000016', now()),
  -- dave: DevOps & SRE
  ('bbbbbbbb-0008-4000-8000-000000000008', 'cccccccc-0017-4000-8000-000000000017', now()),
  ('bbbbbbbb-0008-4000-8000-000000000008', 'cccccccc-0018-4000-8000-000000000018', now()),
  -- eve: Type Theory
  ('bbbbbbbb-0009-4000-8000-000000000009', 'cccccccc-0019-4000-8000-000000000019', now()),
  ('bbbbbbbb-0009-4000-8000-000000000009', 'cccccccc-0020-4000-8000-000000000020', now()),
  -- eve: Cryptography
  ('bbbbbbbb-0010-4000-8000-000000000010', 'cccccccc-0021-4000-8000-000000000021', now()),
  ('bbbbbbbb-0010-4000-8000-000000000010', 'cccccccc-0022-4000-8000-000000000022', now())
ON CONFLICT ("boardId", "resourceId") DO NOTHING;
