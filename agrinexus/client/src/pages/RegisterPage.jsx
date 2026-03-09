import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../services/moduleApi";
import { useAuthStore } from "../store/authStore";
import { ActionButton, FormField, TextInput } from "../components/FormField";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth({ token: data.token, user: data.user });
      navigate("/dashboard");
    }
  });

  const onSubmit = (e) => {
    e.preventDefault();
    registerMutation.mutate({ email, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold">Create AgriNexus account</h1>
        <p className="mt-1 text-sm text-slate-400">Register and start using integrated farm intelligence.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <FormField label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label="Password">
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormField>
          {registerMutation.error ? <p className="text-sm text-red-400">{registerMutation.error.message}</p> : null}
          <ActionButton type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Creating account..." : "Register"}
          </ActionButton>
        </form>

        <p className="mt-4 text-sm text-slate-400">
          Already registered?{" "}
          <Link to="/login" className="text-brand-300 hover:text-brand-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
