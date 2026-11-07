import type { StudentProfile } from "@/components/Navbar";

function record(value:unknown):Record<string,unknown>|null {
  return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
}

/** Interpret the existing same-origin server session envelope, not browser
 * storage or caller-supplied role flags. This is only a client shape guard:
 * cookies, revocation, ownership and permissions remain server-authoritative. */
export function profileFromSessionEnvelope(value:unknown):StudentProfile|null {
  const body=record(value),profile=record(body?.profile),session=record(body?.session);
  if(!profile||!session||!Number.isSafeInteger(profile.id)||Number(profile.id)<=0||
    typeof profile.name!=="string"||typeof profile.email!=="string"||
    typeof profile.isAdmin!=="boolean"||session.profileId!==profile.id||
    session.isAdmin!==profile.isAdmin)return null;
  return profile as unknown as StudentProfile;
}
