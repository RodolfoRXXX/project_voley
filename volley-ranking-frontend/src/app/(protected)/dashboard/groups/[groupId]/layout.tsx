import { GroupFrame } from "@/components/groups/GroupFrame";

export default function GroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <GroupFrame>{children}</GroupFrame>;
}
