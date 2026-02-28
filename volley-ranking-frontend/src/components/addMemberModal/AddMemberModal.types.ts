export type SearchableMember = {
  id: string;
  name: string;
  email?: string | null;
  photoURL?: string | null;
  positions?: string[];
};

export type AddMemberModalProps = {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<SearchableMember[]>;
  onAddMember: (userId: string) => Promise<void>;
};
