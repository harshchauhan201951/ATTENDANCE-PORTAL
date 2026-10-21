export type TeacherBirthday = {
  dateOfBirth: string;
  canonicalName: string;
};

export const teacherBirthdayRecords: Array<TeacherBirthday & { identities: string[] }> = [
  {
    canonicalName: "Harsh Chauhan",
    dateOfBirth: "2002-10-22",
    identities: ["harsh201951", "harsh chauhan"],
  },
  {
    canonicalName: "Lakshita Chauhan",
    dateOfBirth: "2006-09-24",
    identities: ["lakshita chauhan"],
  },
];

function normalizeIdentity(value: string) {
  return value.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]/g, "");
}

export function getTeacherBirthday(...identityValues: Array<string | null | undefined>): TeacherBirthday | null {
  const identities = identityValues
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeIdentity);

  return teacherBirthdayRecords.find((teacher) => {
    const knownIdentities = teacher.identities.map(normalizeIdentity);
    return identities.some((identity) => knownIdentities.includes(identity));
  }) ?? null;
}
