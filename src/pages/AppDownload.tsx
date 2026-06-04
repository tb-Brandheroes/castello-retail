const APK_URL = "/downloads/castello-moments.apk";
const APK_SIZE = "28 MB";

const AppDownload = () => {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full text-center space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-montserrat">
            House of Castello
          </p>
          <h1 className="font-cormorant text-5xl md:text-6xl font-light">
            Install Castello Moments
          </h1>
          <p className="text-muted-foreground font-montserrat text-sm md:text-base">
            Native Android app for the in-store tablet. Works fully offline once installed.
          </p>
        </header>

        <a
          href={APK_URL}
          download
          className="inline-block bg-primary text-primary-foreground font-montserrat tracking-wider uppercase text-sm px-10 py-5 rounded-sm hover:opacity-90 transition-opacity"
        >
          Download APK
        </a>

        <p className="text-xs text-muted-foreground font-montserrat">
          castello-moments.apk · {APK_SIZE}
        </p>

        <section className="text-left bg-muted/30 rounded-sm p-6 space-y-3">
          <h2 className="font-cormorant text-2xl">Installation steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm font-montserrat text-muted-foreground">
            <li>Open this page in Chrome on the Android tablet.</li>
            <li>Tap <strong>Download APK</strong> above.</li>
            <li>
              When prompted, allow Chrome to <em>install unknown apps</em>
              (Settings → Apps → Chrome → Install unknown apps).
            </li>
            <li>Open the downloaded file and tap <strong>Install</strong>.</li>
            <li>Launch <strong>Castello Moments</strong> from the home screen.</li>
          </ol>
        </section>
      </div>
    </main>
  );
};

export default AppDownload;
