-- The restaurant's pin decides every delivery charge, so moving it is logged like the prices are.
create trigger audit after insert or update or delete on public.branches
  for each row execute function private.write_audit_log();
