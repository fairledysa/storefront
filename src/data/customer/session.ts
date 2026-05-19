import { supabaseSSR } from "@/data/store/supabase.ssr";
import { supabaseAdmin } from "@/data/store/supabase.server";

export type CustomerSession = {
  authed: boolean;
  auth_user_id: string | null;
  customer_id: string | null;
  store_id: string | null;
  customer?: {
    id: string;
    birth_date?: string | null;
    gender?: string | null;
    city_id?: string | null;
  } | null;
};

export async function getCustomerSession(params: {
  store_id: string;
}): Promise<CustomerSession> {
  const { store_id } = params;

  // 1) لا نثق إلا في Session Cookies (SSR)
  const sb = await supabaseSSR();
  const { data: auth, error: authErr } = await sb.auth.getUser();

  if (authErr || !auth?.user?.id) {
    return {
      authed: false,
      auth_user_id: null,
      customer_id: null,
      store_id,
      customer: null,
    };
  }

  const auth_user_id = auth.user.id;

  // 2) admin (بـ service role) للوصول للجداول الداخلية
  //    نكسر التايب لتجنب never (لين تولد Types بشكل رسمي)
  const admin: any = supabaseAdmin();

  // 3) Lookup customer by auth_user_id فقط (مستحيل المستخدم يزوّرها)
  const existing = await admin
    .from("customers")
    .select("id,birth_date,gender,city_id")
    .eq("auth_user_id", auth_user_id)
    .maybeSingle();

  if (existing.error) {
    // ما نطلع تفاصيل حساسة للعميل
    return {
      authed: true,
      auth_user_id,
      customer_id: null,
      store_id,
      customer: null,
    };
  }

  // 4) إذا ما عنده customer record (حالة نادرة)
  //    لا ننشئ تلقائي هنا (الأفضل الإنشاء صار في verify)
  const customer_id: string | null = existing.data?.id ?? null;

  // 5) ربط العميل بالمتجر الحالي (مثل سلة)
  //    حتى لو تكررت ما تضر بسبب onConflict
  if (customer_id) {
    const link = await admin
      .from("store_customers")
      .upsert(
        { store_id, customer_id },
        { onConflict: "store_id,customer_id" },
      );

    // ما نوقف الجلسة لو فشل الربط (بس نقدر نعرفه باللوج لاحقًا)
    // لكن ما نفضح تفاصيل للعميل
    if (link.error) {
      // ignore for now
    }
  }

  return {
    authed: true,
    auth_user_id,
    customer_id,
    store_id,
    customer: customer_id
      ? {
          id: customer_id,
          birth_date: existing.data?.birth_date ?? null,
          gender: existing.data?.gender ?? null,
          city_id: existing.data?.city_id ?? null,
        }
      : null,
  };
}
