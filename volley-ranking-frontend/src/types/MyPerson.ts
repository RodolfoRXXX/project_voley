export type MyPerson = {
  personId: string;
  firstName: string;
  lastName: string;
  contactEmail: string;
};

export type EnsureMyPersonInput = {
  firstName: string;
  lastName: string;
  contactEmail: string;
};

export type EnsureMyPersonResult = {
  outcome: "created" | "existing";
  person: MyPerson;
};
