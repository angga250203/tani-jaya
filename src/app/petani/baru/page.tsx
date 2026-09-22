import { FarmerForm } from "@/components/farmers/farmer-form";
import { AppShell } from "@/components/layout/app-shell";

export default function TambahPetaniPage() {
  return <AppShell><FarmerForm mode="create" /></AppShell>;
}
