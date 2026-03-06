import { UploadLabelForm } from "@/components/upload-label-form";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center px-2 py-3 sm:px-4 sm:py-4">
      <section className="mx-auto flex w-full max-w-md items-center justify-center">
        <UploadLabelForm />
      </section>
    </main>
  );
}
