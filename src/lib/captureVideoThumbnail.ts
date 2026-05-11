export async function captureVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)
    video.src = url

    let done = false

    function finish(blob: Blob | null) {
      if (done) return
      done = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(blob)
    }

    // Bail out after 10 s so the upload flow is never blocked indefinitely
    const timer = setTimeout(() => finish(null), 10_000)

    function capture() {
      try {
        const w = video.videoWidth || 320
        const h = video.videoHeight || 240
        const scale = 600 / w
        const canvas = document.createElement('canvas')
        canvas.width = 600
        canvas.height = Math.round(h * scale)
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.8)
      } catch {
        finish(null)
      }
    }

    video.addEventListener('seeked', capture)
    video.addEventListener('error', () => finish(null))

    // loadeddata fires once the first frame is available, so videoWidth/Height are valid
    video.addEventListener('loadeddata', () => {
      const seekTo =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.min(1, video.duration * 0.1)
          : 0
      video.currentTime = seekTo
    })

    // Explicitly start loading (required in some browsers for off-screen elements)
    video.load()
  })
}
