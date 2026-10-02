import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import {
  bookingWorkflowService,
  createWorkflowRequestId,
  type PublicMemberIntakeDto,
  type PublicMemberSubmission,
} from "../services/bookingWorkflowService";

type MemberForm = {
  name: string;
  gender: "male" | "female" | "other" | "";
  height: string;
  weight: string;
  contact: string;
  costumeSizes: Record<string, string>;
};

type IntakeDraftState = { requestId: string; fingerprint: string };

const emptyForm = (): MemberForm => ({
  name: "",
  gender: "",
  height: "",
  weight: "",
  contact: "",
  costumeSizes: {},
});

const errorText = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
  "Không thể tải hoặc gửi thông tin. Vui lòng kiểm tra kết nối rồi thử lại.";

const sessionKey = (token: string) => "yume.member-intake." + hashText(token);

function hashText(value: string) {
  let hash = 14695981039346656037n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return hash.toString(16);
}

function readIntakeState(key: string): IntakeDraftState {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const value = JSON.parse(raw) as Partial<IntakeDraftState>;
      if (typeof value.requestId === "string" && typeof value.fingerprint === "string") {
        return { requestId: value.requestId, fingerprint: value.fingerprint };
      }
    }
  } catch {
    // Start with a fresh idempotency key when session storage is unavailable.
  }
  return { requestId: createWorkflowRequestId(), fingerprint: "" };
}

export default function PublicMemberIntakePage() {
  const { token = "" } = useParams();
  const storageKey = useMemo(() => sessionKey(token), [token]);
  const [intake, setIntake] = useState<PublicMemberIntakeDto | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestState, setRequestState] = useState(() => readIntakeState(storageKey));

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    bookingWorkflowService
      .getPublicMemberIntake(token)
      .then(setIntake)
      .catch((loadError: unknown) => setLoadError(errorText(loadError)))
      .finally(() => setLoading(false));
  }, [token]);

  const update = (patch: Partial<MemberForm>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Nhập họ tên thành viên.";
    if (form.height && (!Number.isFinite(Number(form.height)) || Number(form.height) < 80 || Number(form.height) > 230)) {
      errors.height = "Chiều cao cần từ 80 đến 230 cm.";
    }
    if (form.weight && (!Number.isFinite(Number(form.weight)) || Number(form.weight) < 25 || Number(form.weight) > 250)) {
      errors.weight = "Cân nặng cần từ 25 đến 250 kg.";
    }
    intake?.allowedCostumes.forEach((costume) => {
      if (costume.sizes.length && !form.costumeSizes[costume.costumeId]) {
        errors["costume-" + costume.costumeId] = "Chọn size hoặc báo với lớp rằng bạn chưa lấy trang phục này.";
      }
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }
    if (!intake) return;

    const submission: Omit<PublicMemberSubmission, "requestId"> = {
      name: form.name.trim(),
      ...(form.gender ? { gender: form.gender } : {}),
      ...(form.height ? { height: Number(form.height) } : {}),
      ...(form.weight ? { weight: Number(form.weight) } : {}),
      ...(form.contact.trim() ? { contact: form.contact.trim() } : {}),
      costumeSizes: intake.allowedCostumes
        .filter((costume) => !!form.costumeSizes[costume.costumeId])
        .map((costume) => ({ costumeId: costume.costumeId, size: form.costumeSizes[costume.costumeId] })),
    };
    const fingerprint = hashText(JSON.stringify(submission));
    const requestId =
      requestState.fingerprint === fingerprint ? requestState.requestId : createWorkflowRequestId();
    const nextRequestState = { requestId, fingerprint };
    setRequestState(nextRequestState);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(nextRequestState));
    } catch {
      // The form remains usable if storage is unavailable.
    }

    setSubmitting(true);
    setError("");
    try {
      await bookingWorkflowService.submitPublicMember(token, { ...submission, requestId });
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Ignore storage failures after a successful append.
      }
      setSubmitted(true);
    } catch (submitError) {
      setError(errorText(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const addAnother = () => {
    setSubmitted(false);
    setForm(emptyForm());
    const nextRequestState = { requestId: createWorkflowRequestId(), fingerprint: "" };
    setRequestState(nextRequestState);
  };

  if (loading) {
    return <main className="mx-auto max-w-xl px-4 py-12" role="status">Đang mở biểu mẫu…</main>;
  }
  if (loadError || !intake) {
    return (
      <main className="mx-auto max-w-xl px-4 py-12">
        <section className="rounded-2xl border p-6" role="alert">
          <h1 className="text-xl font-semibold">Không mở được biểu mẫu</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError || "Đường dẫn nhập thông tin không còn hiệu lực."}</p>
          <p className="mt-3 text-sm text-muted-foreground">Hãy nhờ người đại diện lớp xin lại đường dẫn từ Yume Studio.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Yume Studio · Thông tin thành viên</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{intake.bookingTitle}</h1>
        <p className="text-muted-foreground">{intake.packageName}</p>
        <p className="text-sm text-muted-foreground">
          Mỗi thành viên chỉ khai báo thông tin của mình. Danh sách và thông tin của các bạn khác không hiển thị trên biểu mẫu này.
        </p>
      </header>

      {submitted ? (
        <section className="space-y-4 rounded-2xl border border-emerald-600/20 bg-emerald-600/5 p-6" role="status">
          <h2 className="text-xl font-semibold">Đã gửi thông tin</h2>
          <p className="text-sm text-muted-foreground">Yume đã nhận thông tin của bạn cho lớp {intake.bookingTitle}. Bạn có thể tiếp tục khai báo cho thành viên khác.</p>
          <Button className="min-h-11" onClick={addAnother}>Khai báo thành viên khác</Button>
        </section>
      ) : (
        <section className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Thông tin của bạn</h2>
            <p className="mt-1 text-sm text-muted-foreground">Thông tin sẽ được gửi riêng cho đại diện lớp và Yume để chuẩn bị trang phục.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="member-name" className="text-sm font-medium">Họ tên <span aria-hidden="true">*</span></label>
              <Input id="member-name" autoComplete="name" maxLength={100} className="min-h-11" value={form.name} aria-invalid={!!fieldErrors.name} onChange={(event) => update({ name: event.target.value })} />
              {fieldErrors.name && <p role="alert" className="text-sm text-destructive">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="member-gender" className="text-sm font-medium">Giới tính (tuỳ chọn)</label>
              <select id="member-gender" className="min-h-11 w-full rounded-lg border bg-background px-3 text-base" value={form.gender} onChange={(event) => update({ gender: event.target.value as MemberForm["gender"] })}>
                <option value="">Không muốn cung cấp</option>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="member-contact" className="text-sm font-medium">Số liên hệ (tuỳ chọn)</label>
              <Input id="member-contact" type="tel" autoComplete="tel" className="min-h-11" maxLength={25} value={form.contact} onChange={(event) => update({ contact: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="member-height" className="text-sm font-medium">Chiều cao (cm, tuỳ chọn)</label>
              <Input id="member-height" type="number" inputMode="decimal" min={80} max={230} className="min-h-11" value={form.height} aria-invalid={!!fieldErrors.height} onChange={(event) => update({ height: event.target.value })} />
              {fieldErrors.height && <p role="alert" className="text-sm text-destructive">{fieldErrors.height}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="member-weight" className="text-sm font-medium">Cân nặng (kg, tuỳ chọn)</label>
              <Input id="member-weight" type="number" inputMode="decimal" min={25} max={250} className="min-h-11" value={form.weight} aria-invalid={!!fieldErrors.weight} onChange={(event) => update({ weight: event.target.value })} />
              {fieldErrors.weight && <p role="alert" className="text-sm text-destructive">{fieldErrors.weight}</p>}
            </div>
          </div>

          {intake.allowedCostumes.length > 0 && (
            <section className="space-y-3 border-t pt-4">
              <div>
                <h3 className="font-semibold">Size trang phục được chuẩn bị</h3>
                <p className="mt-1 text-sm text-muted-foreground">Chọn size theo từng loại trang phục để lớp chốt đủ danh sách trước ngày chụp.</p>
              </div>
              {intake.allowedCostumes.map((costume) => (
                <div key={costume.costumeId} className="space-y-1.5">
                  <label htmlFor={"costume-" + costume.costumeId} className="text-sm font-medium">{costume.name}</label>
                  <select
                    id={"costume-" + costume.costumeId}
                    className="min-h-11 w-full rounded-lg border bg-background px-3 text-base"
                    value={form.costumeSizes[costume.costumeId] || ""}
                    aria-invalid={!!fieldErrors["costume-" + costume.costumeId]}
                    onChange={(event) => update({ costumeSizes: { ...form.costumeSizes, [costume.costumeId]: event.target.value } })}
                  >
                    <option value="">Chọn size</option>
                    {costume.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                  {fieldErrors["costume-" + costume.costumeId] && <p role="alert" className="text-sm text-destructive">{fieldErrors["costume-" + costume.costumeId]}</p>}
                </div>
              ))}
            </section>
          )}

          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={submitting} onClick={submit}>
            {submitting ? "Đang gửi…" : "Gửi thông tin của tôi"}
          </Button>
          <p className="text-xs text-muted-foreground">Đã khai báo trước đó? Gửi lại cùng thông tin để xác nhận lần trước, hoặc nhờ đại diện lớp điều chỉnh hồ sơ.</p>
        </section>
      )}
    </main>
  );
}
