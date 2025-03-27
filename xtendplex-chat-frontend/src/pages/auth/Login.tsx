import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-10 w-10 items-center justify-center">
            <img
              src="/xtendplex-logo.png"
              alt="XtendPlex Logo"
              className="h-10 w-auto"
            />
          </div>
          <span className="text-xl font-bold">XtendPlex Chat</span>
        </a>
        <LoginForm />
      </div>
    </div>
  );
}
