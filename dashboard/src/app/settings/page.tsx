export default function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <h2 className="text-2xl font-outfit font-bold">Module Under Construction</h2>
      <p className="text-slate-400">This feature is being developed as part of Phase 2.</p>
    </div>
  );
}
