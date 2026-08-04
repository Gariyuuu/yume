"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendMagicLinkAction, signInAction, type AuthActionState } from "../actions";

const initialState: AuthActionState = {};

export default function SignInPage() {
  const [passwordState, passwordFormAction, passwordPending] = useActionState(
    signInAction,
    initialState
  );
  const [magicLinkState, magicLinkFormAction, magicLinkPending] = useActionState(
    sendMagicLinkAction,
    initialState
  );

  return (
    <Card className="rounded-card">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="password">
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="magic-link">Magic link</TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <form action={passwordFormAction} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              {passwordState.error ? (
                <p className="text-sm text-destructive">{passwordState.error}</p>
              ) : null}
              <Button type="submit" disabled={passwordPending} className="mt-1">
                {passwordPending ? "Signing in…" : "Sign in"}
              </Button>
              <Link
                href="/reset-password"
                className="text-center text-sm text-muted-foreground underline underline-offset-4"
              >
                Forgot your password?
              </Link>
            </form>
          </TabsContent>

          <TabsContent value="magic-link">
            <form action={magicLinkFormAction} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="magic-email">Email</Label>
                <Input id="magic-email" name="email" type="email" required autoComplete="email" />
              </div>
              {magicLinkState.error ? (
                <p className="text-sm text-destructive">{magicLinkState.error}</p>
              ) : null}
              {magicLinkState.message ? (
                <p className="text-sm text-muted-foreground">{magicLinkState.message}</p>
              ) : null}
              <Button type="submit" disabled={magicLinkPending} className="mt-1">
                {magicLinkPending ? "Sending…" : "Send magic link"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/sign-up" className="underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
