import { useEffect, useRef } from "react"
import { useAudioHelper } from "../../contexts/audio-helper-context/etc.js"
import { useTauWebsocket } from "../../contexts/tau-ws-provider/etc.js"
export function Autoplayer({
    filter = () => true,
    autoplay = true
}) {
    let websocket_context = useTauWebsocket()
    if (!websocket_context) throw new Error("Autoplayer component must be inside a websocket context.")
    let { message$ } = websocket_context
    let { create_delta_play_job } = useAudioHelper()
    let autoplay_jobs_ref = useRef({})

    useEffect(() => {
        if (!autoplay) return
        let subscriber = message$.current.subscribe((data) => {
            if (!filter(data)) return
            if (data.type === "response.audio.delta") {
                let { response_id, delta } = data
                let autoplay_jobs = autoplay_jobs_ref.current
                let job = autoplay_jobs[response_id]
                if (!job) {
                    job = create_delta_play_job()
                    autoplay_jobs[response_id] = job
                }
                job.add_delta(delta)
            }
        })


        return () => subscriber.unsubscribe()
    }, [autoplay])


    return null
}