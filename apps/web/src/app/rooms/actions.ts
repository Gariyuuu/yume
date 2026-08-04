"use server";

import { createRoomInputSchema } from "@yume/room-schema";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export type CreateRoomState = {
  error?: string;
};

export async function createRoomAction(
  _prevState: CreateRoomState,
  formData: FormData
): Promise<CreateRoomState> {
  const user = await requireUser();

  const parsed = createRoomInputSchema.safeParse({
    name: formData.get("name"),
    template_id: formData.get("templateId") || undefined
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      template_id: parsed.data.template_id ?? null
    })
    .select("id")
    .single();

  if (error || !room) {
    return { error: error?.message ?? "Could not create room." };
  }

  redirect(`/room/${room.id}`);
}
