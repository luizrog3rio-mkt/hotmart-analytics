-- ============================================
-- Hotmart Sales Analytics - Seed Data
-- Run after migrations to populate test data
-- ============================================

-- Note: This seed assumes a test user already exists in auth.users
-- with id = '00000000-0000-0000-0000-000000000001'
-- In production, users are created via Supabase Auth signup

-- ============================================
-- TEST USER PROFILE
-- ============================================
INSERT INTO public.profiles (id, email, full_name, plan, onboarding_completed, onboarding_step)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@hotmart-analytics.com',
  'Luiz Rogério',
  'pro',
  true,
  6
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PRODUCTS
-- ============================================
INSERT INTO public.products (id, user_id, hotmart_product_id, name, description, price, type, status) VALUES
  ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'HT-001', 'Curso Completo de Marketing Digital', 'Aprenda marketing digital do zero ao avançado', 297.00, 'digital', 'active'),
  ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'HT-002', 'Masterclass de Copywriting', 'Domine a arte de escrever textos que vendem', 497.00, 'digital', 'active'),
  ('11111111-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'HT-003', 'Método de Vendas Online 2.0', 'Sistema completo de vendas automatizadas', 997.00, 'digital', 'active'),
  ('11111111-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'HT-004', 'Mentoria Premium Anual', 'Acompanhamento personalizado por 12 meses', 1997.00, 'subscription', 'active'),
  ('11111111-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'HT-005', 'Ebook: Funil de Vendas', 'Guia prático para construir funis de alta conversão', 47.00, 'digital', 'active'),
  ('11111111-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'HT-006', 'Workshop de Tráfego Pago', 'Masterclass ao vivo sobre Facebook e Google Ads', 197.00, 'digital', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- AFFILIATES
-- ============================================
INSERT INTO public.affiliates (id, user_id, hotmart_affiliate_id, name, email, commission_rate, total_sales, total_revenue) VALUES
  ('22222222-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'AF-001', 'João Silva', 'joao.silva@email.com', 40.00, 145, 43500.00),
  ('22222222-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'AF-002', 'Maria Santos', 'maria.santos@email.com', 35.00, 198, 59400.00),
  ('22222222-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'AF-003', 'Pedro Oliveira', 'pedro.oliveira@email.com', 30.00, 87, 26100.00),
  ('22222222-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'AF-004', 'Ana Costa', 'ana.costa@email.com', 40.00, 112, 33600.00),
  ('22222222-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'AF-005', 'Carlos Souza', 'carlos.souza@email.com', 25.00, 63, 18900.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TRANSACTIONS (sample - 20 transactions)
-- ============================================
INSERT INTO public.transactions (id, user_id, product_id, buyer_email, buyer_name, amount, net_amount, status, payment_method, source, utm_source, utm_medium, utm_campaign, affiliate_id, country, state, created_at) VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'lucas.martins@email.com', 'Lucas Martins', 297.00, 267.30, 'approved', 'credit_card', 'organic', NULL, NULL, NULL, NULL, 'BR', 'SP', NOW() - INTERVAL '1 day'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'patricia.gomes@email.com', 'Patricia Gomes', 497.00, 347.90, 'approved', 'pix', 'affiliate', 'google', 'cpc', NULL, '22222222-0000-0000-0000-000000000001', 'BR', 'RJ', NOW() - INTERVAL '1 day'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'ricardo.nascimento@email.com', 'Ricardo Nascimento', 997.00, 897.30, 'approved', 'credit_card', 'campaign', 'facebook', 'social', 'black-friday', NULL, 'BR', 'MG', NOW() - INTERVAL '2 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005', 'beatriz.ribeiro@email.com', 'Beatriz Ribeiro', 47.00, 42.30, 'approved', 'pix', 'organic', NULL, NULL, NULL, NULL, 'BR', 'SP', NOW() - INTERVAL '2 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'felipe.carvalho@email.com', 'Felipe Carvalho', 297.00, 207.90, 'approved', 'boleto', 'affiliate', 'instagram', 'social', NULL, '22222222-0000-0000-0000-000000000002', 'BR', 'RS', NOW() - INTERVAL '3 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'amanda.dias@email.com', 'Amanda Dias', 1997.00, 1797.30, 'approved', 'credit_card', 'organic', NULL, NULL, NULL, NULL, 'BR', 'SP', NOW() - INTERVAL '3 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006', 'thiago.moreira@email.com', 'Thiago Moreira', 197.00, 177.30, 'approved', 'pix', 'campaign', 'youtube', 'cpc', 'lancamento-v2', NULL, 'BR', 'PR', NOW() - INTERVAL '4 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'larissa.barbosa@email.com', 'Larissa Barbosa', 297.00, 267.30, 'refunded', 'credit_card', 'organic', NULL, NULL, NULL, NULL, 'BR', 'BA', NOW() - INTERVAL '5 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'gustavo.pereira@email.com', 'Gustavo Pereira', 497.00, 447.30, 'approved', 'credit_card', 'affiliate', 'google', 'cpc', NULL, '22222222-0000-0000-0000-000000000003', 'PT', NULL, NOW() - INTERVAL '5 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'isabela.araujo@email.com', 'Isabela Araujo', 997.00, 897.30, 'approved', 'paypal', 'campaign', 'facebook', 'social', 'remarketing', NULL, 'US', NULL, NOW() - INTERVAL '6 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005', 'diego.nunes@email.com', 'Diego Nunes', 47.00, 42.30, 'pending', 'boleto', 'organic', NULL, NULL, NULL, NULL, 'BR', 'CE', NOW() - INTERVAL '6 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'vanessa.campos@email.com', 'Vanessa Campos', 297.00, 207.90, 'approved', 'credit_card', 'affiliate', NULL, NULL, NULL, '22222222-0000-0000-0000-000000000004', 'BR', 'SC', NOW() - INTERVAL '7 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'lucas.martins2@email.com', 'Lucas Martins Jr', 1997.00, 1797.30, 'approved', 'credit_card', 'organic', NULL, NULL, NULL, NULL, 'BR', 'SP', NOW() - INTERVAL '8 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006', 'camila.ferreira@email.com', 'Camila Ferreira', 197.00, 137.90, 'approved', 'pix', 'affiliate', 'tiktok', 'social', NULL, '22222222-0000-0000-0000-000000000005', 'BR', 'GO', NOW() - INTERVAL '9 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'rafael.mendes@email.com', 'Rafael Mendes', 497.00, 447.30, 'cancelled', 'boleto', 'campaign', 'google', 'cpc', 'search-branded', NULL, 'BR', 'PE', NOW() - INTERVAL '10 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'juliana.rocha@email.com', 'Juliana Rocha', 297.00, 267.30, 'approved', 'credit_card', 'organic', NULL, NULL, NULL, NULL, 'MX', NULL, NOW() - INTERVAL '12 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'bruno.almeida@email.com', 'Bruno Almeida', 997.00, 697.90, 'approved', 'credit_card', 'affiliate', 'facebook', 'social', NULL, '22222222-0000-0000-0000-000000000001', 'BR', 'SP', NOW() - INTERVAL '14 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005', 'fernanda.lima@email.com', 'Fernanda Lima', 47.00, 42.30, 'approved', 'pix', 'organic', NULL, NULL, NULL, NULL, 'CO', NULL, NOW() - INTERVAL '15 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'marcos.silva@email.com', 'Marcos Silva', 297.00, 267.30, 'disputed', 'credit_card', 'campaign', 'google', 'cpc', 'remarketing', NULL, 'BR', 'RJ', NOW() - INTERVAL '18 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'ana.paula@email.com', 'Ana Paula Costa', 1997.00, 1797.30, 'approved', 'credit_card', 'organic', NULL, NULL, NULL, NULL, 'AR', NULL, NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUBSCRIPTIONS (for subscription products)
-- ============================================
INSERT INTO public.subscriptions (id, user_id, product_id, buyer_email, status, started_at, next_billing) VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'amanda.dias@email.com', 'active', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'lucas.martins2@email.com', 'active', NOW() - INTERVAL '8 days', NOW() + INTERVAL '22 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'ana.paula@email.com', 'active', NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DAILY METRICS (last 30 days)
-- ============================================
INSERT INTO public.daily_metrics (user_id, date, revenue, sales_count, refund_count, mrr, churn_rate, avg_ticket)
SELECT
  '00000000-0000-0000-0000-000000000001',
  d::date,
  ROUND((5000 + RANDOM() * 10000)::numeric, 2),
  FLOOR(10 + RANDOM() * 30)::int,
  FLOOR(RANDOM() * 3)::int,
  ROUND((18000 + RANDOM() * 5000)::numeric, 2),
  ROUND((2 + RANDOM() * 6)::numeric, 2),
  ROUND((250 + RANDOM() * 200)::numeric, 2)
FROM generate_series(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE,
  '1 day'::interval
) AS d
ON CONFLICT (user_id, date) DO NOTHING;

-- ============================================
-- GOALS
-- ============================================
INSERT INTO public.goals (user_id, type, target, period) VALUES
  ('00000000-0000-0000-0000-000000000001', 'revenue', 250000.00, 'monthly'),
  ('00000000-0000-0000-0000-000000000001', 'sales', 25.00, 'daily'),
  ('00000000-0000-0000-0000-000000000001', 'refund_rate', 5.00, 'monthly'),
  ('00000000-0000-0000-0000-000000000001', 'churn_rate', 5.00, 'monthly')
ON CONFLICT DO NOTHING;

-- ============================================
-- ALERTS CONFIG
-- ============================================
INSERT INTO public.alerts_config (user_id, type, threshold, channel, enabled) VALUES
  ('00000000-0000-0000-0000-000000000001', 'new_sale', 0, 'telegram', true),
  ('00000000-0000-0000-0000-000000000001', 'goal_reached', 0, 'email', true),
  ('00000000-0000-0000-0000-000000000001', 'refund_spike', 10, 'email', true),
  ('00000000-0000-0000-0000-000000000001', 'conversion_drop', 20, 'telegram', false),
  ('00000000-0000-0000-0000-000000000001', 'churn_elevated', 8, 'email', true)
ON CONFLICT DO NOTHING;
