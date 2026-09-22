import { AppShell } from "./app-shell";
import { ContentContainer } from "./content-container";
import { PageHeader } from "./page-header";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type AppPlaceholderPageProps = {
  title: string;
  description: string;
};

export function AppPlaceholderPage({
  title,
  description,
}: AppPlaceholderPageProps) {
  return (
    <AppShell>
      <div className="py-5 sm:py-6 lg:py-8">
        <ContentContainer>
          <PageHeader subtitle="Tani Jaya" title={title} />
          <Card className="mt-6 max-w-2xl">
            <CardContent className="p-5">
              <FileText aria-hidden="true" className="mb-3 text-tj-primary" size={24} />
              <h2 className="text-lg font-bold text-tj-text">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-tj-muted">{description}</p>
            </CardContent>
          </Card>
        </ContentContainer>
      </div>
    </AppShell>
  );
}
