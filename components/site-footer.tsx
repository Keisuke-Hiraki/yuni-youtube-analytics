export function SiteFooter() {
  return (
    <footer className="w-full py-4 border-t mt-8">
      <div className="max-w-screen-xl mx-auto flex justify-center items-center px-4 md:px-6">
        <p className="text-sm text-muted-foreground">
          powered by{" "}
          <a href="https://vercel.com/" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
            Vercel
          </a>
        </p>
      </div>
    </footer>
  )
}
