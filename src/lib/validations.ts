import { z } from "zod";

const indonesianPhonePattern = /^(?:\+62|62|0)8\d{7,12}$/;

export const farmerFormSchema = z.object({
  name: z.string().trim().min(1, "Nama petani wajib diisi."),
  whatsapp: z
    .string()
    .trim()
    .min(1, "Nomor WhatsApp wajib diisi.")
    .refine(
      (value) => indonesianPhonePattern.test(value.replace(/[\s-]/g, "")),
      "Nomor WhatsApp tidak valid.",
    ),
  landmark: z.string().trim().min(1, "Patokan kebun wajib diisi."),
  note: z.string().trim().optional(),
});

export type FarmerFormValues = z.infer<typeof farmerFormSchema>;

export const fieldFormSchema = z.object({
  name: z.string().trim().min(1, "Nama lahan wajib diisi."),
  landmark: z.string().trim().min(1, "Patokan lahan wajib diisi."),
  note: z.string().trim().optional(),
});

export type FieldFormValues = z.infer<typeof fieldFormSchema>;

export const cycleFormSchema = z.object({
  commodity: z.string().trim().min(1, "Komoditas wajib dipilih."),
  intervalDays: z
    .number({ error: "Interval panen wajib diisi." })
    .int("Interval panen harus berupa bilangan bulat.")
    .min(1, "Interval panen minimal 1 hari."),
  defaultReceivingMethod: z.enum(["DIAMBIL", "DIANTAR"], {
    error: "Metode penerimaan default wajib dipilih.",
  }),
  notes: z.string().trim().optional(),
});

export const cycleEditSchema = cycleFormSchema.omit({ commodity: true });

export type CycleFormValues = z.infer<typeof cycleFormSchema>;
export type CycleEditValues = z.infer<typeof cycleEditSchema>;

const weightSchema = z.number({ error: "Berat wajib diisi dan harus berupa kilogram bulat." }).int("Berat harus berupa kilogram bulat.").min(0, "Berat tidak boleh negatif.");

const transactionItemBaseSchema = z.object({
  id: z.string().uuid().optional(),
  commodity: z.string().trim().min(1, "Komoditas wajib dipilih."),
  grade: z.enum(["SP", "TG", "BR"], { error: "Grade wajib dipilih." }),
  deduction: weightSchema.optional(),
  pricePerKg: z.number({ error: "Harga per kg wajib diisi." }).int("Harga per kg harus berupa bilangan bulat.").min(0, "Harga per kg tidak boleh negatif."),
});

const activeContainerWeightSchema = z.object({
  id: z.string().uuid().optional(),
  weight: weightSchema.refine((weight) => weight > 0, "Berat wadah harus lebih dari 0 kg."),
});

const inactiveContainerWeightSchema = z.object({ id: z.string().uuid().optional(), weight: z.number().optional() });

const directWeighingItemSchema = transactionItemBaseSchema.extend({
  weighingMethod: z.literal("TOTAL_LANGSUNG"),
  grossWeight: weightSchema,
  // Container values can remain while a user changes method, but are intentionally ignored.
  containers: z.array(inactiveContainerWeightSchema).optional(),
}).superRefine((item, context) => {
  const deduction = item.deduction ?? 0;
  if (item.grossWeight <= 0) context.addIssue({ code: "custom", message: "Berat kotor harus lebih dari 0 kg.", path: ["grossWeight"] });
  if (deduction > item.grossWeight) context.addIssue({ code: "custom", message: "Potongan tidak boleh melebihi berat kotor.", path: ["deduction"] });
});

const containerWeighingItemSchema = transactionItemBaseSchema.extend({
  grossWeight: z.number().optional(),
  containers: z.array(activeContainerWeightSchema).min(1, "Tambahkan minimal satu wadah."),
});

const sackWeighingItemSchema = containerWeighingItemSchema.extend({
  weighingMethod: z.literal("PER_KARUNG"),
}).superRefine((item, context) => {
  const grossWeight = item.containers.reduce((total, container) => total + container.weight, 0);
  const deduction = item.deduction ?? 0;
  if (deduction > grossWeight) context.addIssue({ code: "custom", message: "Potongan tidak boleh melebihi berat kotor.", path: ["deduction"] });
});

const crateWeighingItemSchema = containerWeighingItemSchema.extend({
  weighingMethod: z.literal("PER_PETI"),
}).superRefine((item, context) => {
  const grossWeight = item.containers.reduce((total, container) => total + container.weight, 0);
  const deduction = item.deduction ?? 0;
  if (deduction > grossWeight) context.addIssue({ code: "custom", message: "Potongan tidak boleh melebihi berat kotor.", path: ["deduction"] });
});

const transactionItemFormSchema = z.discriminatedUnion("weighingMethod", [
  directWeighingItemSchema,
  sackWeighingItemSchema,
  crateWeighingItemSchema,
]);

export const transactionFormSchema = z.object({
  transactionDate: z.string().min(1, "Tanggal transaksi wajib diisi."),
  transactionTime: z.string().optional(),
  sellerType: z.enum(["PETANI_MITRA", "PENJUAL_UMUM"]),
  farmerId: z.string().optional(),
  sellerName: z.string().trim().optional(),
  scheduleId: z.string().optional(),
  fieldId: z.string().optional(),
  cycleId: z.string().optional(),
  paymentStatus: z.enum(["PAID", "UNPAID"]).optional(),
  notes: z.string().trim().optional(),
  items: z.array(transactionItemFormSchema).min(1, "Tambahkan minimal satu komoditas."),
}).superRefine((transaction, context) => {
  if (transaction.sellerType === "PETANI_MITRA" && !transaction.farmerId) context.addIssue({ code: "custom", message: "Pilih petani mitra.", path: ["farmerId"] });
  if (transaction.sellerType === "PETANI_MITRA" && !transaction.paymentStatus) context.addIssue({ code: "custom", message: "Pilih status pembayaran.", path: ["paymentStatus"] });
  if (transaction.sellerType === "PENJUAL_UMUM" && !transaction.sellerName?.trim()) context.addIssue({ code: "custom", message: "Nama penjual wajib diisi.", path: ["sellerName"] });
});
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const legacySimpleTransactionItemSchema = z.object({
  commodity: z.string().min(1, "Komoditas wajib diisi."),
  weightKg: z.coerce.number().int().positive("Berat harus lebih dari 0 kg."),
  pricePerKg: z.coerce.number().int().positive("Harga per kg wajib diisi."),
});

export const newTransactionSchema = z.object({
  source: z.enum(["PETANI_MITRA", "PENJUAL_UMUM"]),
  sellerName: z.string().min(2, "Nama wajib diisi."),
  items: z.array(legacySimpleTransactionItemSchema).min(1, "Tambahkan minimal satu komoditas."),
});

export type NewTransactionValues = z.infer<typeof newTransactionSchema>;

export const totalanFormSchema = z.object({
  farmerId: z.string().min(1, "Pilih petani terlebih dahulu."),
  transactionIds: z.array(z.string()).min(1, "Pilih minimal satu transaksi."),
  kasbonDeduction: z.number({ error: "Potongan kasbon harus berupa angka." }).int("Potongan kasbon harus berupa Rupiah bulat.").min(0, "Potongan kasbon tidak boleh negatif.").optional(),
});

export type TotalanFormValues = z.infer<typeof totalanFormSchema>;

export const kasbonFormSchema = z.object({
  date: z.string().min(1, "Tanggal kasbon wajib diisi."),
  amount: z.number({ error: "Nominal kasbon wajib diisi." }).int("Nominal kasbon harus berupa Rupiah bulat.").positive("Nominal kasbon harus lebih dari Rp0."),
  note: z.string().trim().optional(),
});

export type KasbonFormValues = z.infer<typeof kasbonFormSchema>;
