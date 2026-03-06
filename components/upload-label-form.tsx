"use client";

import { useMemo, useRef, useState } from "react";
import { LoaderCircle, MapPinned, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CORNERS, type Corner } from "@/lib/pdf/constants";
import { cn } from "@/lib/utils";

const cornerLabels: Record<Corner, string> = {
  "top-left": "Lewy górny",
  "top-right": "Prawy górny",
  "bottom-left": "Lewy dolny",
  "bottom-right": "Prawy dolny",
};

export function UploadLabelForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [corner, setCorner] = useState<Corner>("top-left");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const fileSummary = useMemo(() => {
    if (!file) {
      return "Nie wybrano jeszcze pliku PDF.";
    }

    const sizeInMb = (file.size / 1024 / 1024).toFixed(2);
    return `${file.name} · ${sizeInMb} MB`;
  }, [file]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Najpierw wybierz plik PDF.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("corner", corner);

    try {
      const response = await fetch("/api/reposition", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Serwer nie mógł wygenerować pliku PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name.replace(/\.pdf$/i, "-repositioned.pdf");
      anchor.click();

      const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
      openedWindow?.focus();

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setStatus("done");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (submissionError) {
      setStatus("error");
      setError(submissionError instanceof Error ? submissionError.message : "Wystąpił nieoczekiwany błąd.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="overflow-hidden">
        <CardHeader className="gap-3 pb-5">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MapPinned className="size-6" />
          </div>
          <div className="space-y-2">
            <CardTitle>Przenieś etykietę do wybranego rogu kartki A4</CardTitle>
            <CardDescription>
              Wgraj jednostronicowy plik PDF w formacie A4, wybierz docelowy róg i pobierz wynikowy plik PDF A4 gotowy do druku.
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              Dla drukarki Brother T510W lewy i prawy róg są kompensowane automatycznie, więc wybór odpowiada końcowemu położeniu na wydruku.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-3">
              <Label htmlFor="pdf">Plik PDF z etykietą</Label>
              <Input
                ref={fileInputRef}
                id="pdf"
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setFile(nextFile);
                  setStatus("idle");
                  setError(null);
                }}
              />
              <p className="text-sm text-muted-foreground">{fileSummary}</p>
            </div>

            <div className="space-y-3">
              <Label>Docelowy róg</Label>
              <RadioGroup
                value={corner}
                onValueChange={(value) => setCorner(value as Corner)}
                className="grid grid-cols-2 gap-3"
              >
                {CORNERS.map((item) => {
                  const selected = corner === item;

                  return (
                    <label
                      key={item}
                      htmlFor={item}
                      className={cn(
                        "relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-3 transition",
                        selected
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "border-border/80 bg-background/70",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{cornerLabels[item]}</span>
                        <RadioGroupItem id={item} value={item} />
                      </div>
                      <div className="flex justify-center rounded-xl border border-dashed border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(219,234,254,0.45))] p-2">
                        <div className="grid aspect-[1/1.414] w-full max-w-[11rem] grid-cols-2 grid-rows-2 gap-2">
                          {CORNERS.map((previewCorner) => (
                            <div
                              key={previewCorner}
                              className={cn(
                                "rounded-md border border-border/60 bg-white/75",
                                previewCorner === item && "bg-accent ring-2 ring-primary/60",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {status === "done" ? (
              <p className="text-sm text-emerald-700">
                Plik PDF został wygenerowany. Przeglądarka powinna go teraz pobrać, a na telefonie otwarta karta pozwoli od razu wydrukować dokument.
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full">
              {status === "submitting" ? (
                <>
                  <LoaderCircle className="size-5 animate-spin" />
                  Przetwarzanie PDF
                </>
              ) : (
                <>
                  <Upload className="size-5" />
                  Generuj wynikowy PDF
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
