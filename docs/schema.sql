-- Tabela para persistir as licitações salvas por usuário no Supabase
CREATE TABLE IF NOT EXISTS public.licitacoes_salvas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numero_controle_pncp TEXT NOT NULL,
    titulo TEXT NOT NULL,
    resumo TEXT,
    orgao TEXT,
    uf TEXT,
    municipio TEXT,
    modalidade_nome TEXT,
    portal_nome TEXT,
    data_encerramento TIMESTAMPTZ,
    link_pncp TEXT,
    link_sistema_origem TEXT,
    valor_estimado NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, numero_controle_pncp)
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.licitacoes_salvas ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança: Usuário só lê, insere e deleta seus próprios registros
CREATE POLICY "Usuários podem ver suas próprias licitações salvas"
    ON public.licitacoes_salvas
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem salvar licitações"
    ON public.licitacoes_salvas
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas licitações salvas"
    ON public.licitacoes_salvas
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas licitações salvas"
    ON public.licitacoes_salvas
    FOR DELETE
    USING (auth.uid() = user_id);

-- Índice para acelerar a busca por data de encerramento e usuário
CREATE INDEX IF NOT EXISTS idx_licitacoes_salvas_user_enc ON public.licitacoes_salvas (user_id, data_encerramento);
