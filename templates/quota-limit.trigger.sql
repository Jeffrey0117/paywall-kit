-- quota-limit.trigger.sql — 配額上限「後端硬性強制」範本（Postgres / Supabase）
-- 前端擋是體驗，這個才是牆：不管用什麼方式 insert 都算數。
--
-- 改這三個 placeholder 後執行：
--   {{RESOURCE_TABLE}}   受限資源表，例如 keywords / projects / uploads
--   {{OWNER_COLUMN}}     資源表上指向使用者的欄位，例如 creator_id / user_id
--   {{FREE_LIMIT}}       免費版上限數字，例如 3
-- 假設會員等級在 public.user_profiles.membership_tier（'free' 以外皆視為付費不限量）。

CREATE OR REPLACE FUNCTION public.enforce_free_quota_{{RESOURCE_TABLE}}()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier TEXT;
  current_count INT;
BEGIN
  SELECT membership_tier INTO user_tier
  FROM public.user_profiles
  WHERE id = NEW.{{OWNER_COLUMN}};

  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;

  -- 付費方案不限量
  IF user_tier <> 'free' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.{{RESOURCE_TABLE}}
  WHERE {{OWNER_COLUMN}} = NEW.{{OWNER_COLUMN}};

  IF current_count >= {{FREE_LIMIT}} THEN
    RAISE EXCEPTION 'FREE_QUOTA_LIMIT_REACHED: 免費版最多 {{FREE_LIMIT}} 個，請升級'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_quota_{{RESOURCE_TABLE}} ON public.{{RESOURCE_TABLE}};
CREATE TRIGGER trg_enforce_free_quota_{{RESOURCE_TABLE}}
  BEFORE INSERT ON public.{{RESOURCE_TABLE}}
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_quota_{{RESOURCE_TABLE}}();

-- 前端接：insert 失敗時偵測 error.message 含 'FREE_QUOTA_LIMIT_REACHED' → 導向 /pricing
