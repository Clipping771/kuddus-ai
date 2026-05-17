import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold",
              card: "bg-neutral-900 border border-neutral-800",
              headerTitle: "text-neutral-100",
              headerSubtitle: "text-neutral-400",
              socialButtonsBlockButton: "bg-neutral-800 border border-neutral-700 text-neutral-200 hover:bg-neutral-700",
              formFieldLabel: "text-neutral-300",
              formFieldInput: "bg-neutral-950 border border-neutral-800 text-neutral-100 focus:border-amber-500",
              footerActionLink: "text-amber-500 hover:text-amber-400"
            }
          }}
        />
      </div>
    </div>
  );
}
