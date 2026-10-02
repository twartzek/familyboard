export default function ErrorView(error) {
  return (
    <div className="grid h-full w-full place-items-center justify-center bg-black text-white">
      Fehler: {error.error.message}
    </div>
  );
}
