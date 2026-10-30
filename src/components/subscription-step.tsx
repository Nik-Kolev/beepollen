import { Container } from "@/components/container";
import { SubscriptionSubmit } from "@/components/subscription-submit";

export function SubscriptionStep({
  heading,
  text,
  form,
}: {
  heading: string;
  text: string;
  form?: {
    action: (formData: FormData) => Promise<void>;
    token: string;
    label: string;
  };
}) {
  return (
    <Container>
      <div className="mx-auto max-w-2xl py-8 sm:py-12">
        <h1 className="text-2xl font-semibold sm:text-3xl">{heading}</h1>
        <p className="mt-4">{text}</p>
        {form && (
          <form action={form.action} className="mt-6">
            <input type="hidden" name="token" value={form.token} />
            <SubscriptionSubmit label={form.label} />
          </form>
        )}
      </div>
    </Container>
  );
}
