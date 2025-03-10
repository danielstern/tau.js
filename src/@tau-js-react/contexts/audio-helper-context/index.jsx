import { useEffect, useState, useRef } from "react"
import { useTauAudio } from "../tau-audio-provider/etc.js"
import { AudioHelperContext, delta_to_buffer } from "./etc.js"

export function AudioHelperProvider({ children }) { 

    let [initialized, set_initialized] = useState(false)
    let analyzer_ref = useRef(null)
    let volume_node_ref = useRef(null)
    let destination_ref = useRef(null)
    let [volume, set_volume] = useState(1)
    let { audio_context } = useTauAudio()
    let [analyser, set_analyzer] = useState(null)
    let sources = new Set()
    let audio_context_ref = useRef(null)

    useEffect(()=>{
        if (audio_context_ref.current) return
        audio_context_ref.current = audio_context
    }, [audio_context])

    useEffect(() => {
        if (initialized) return
        if (!audio_context) return

        let analyser = audio_context.createAnalyser()
        analyzer_ref.current = analyser
        set_analyzer(analyser)

        let volume_node = audio_context.createGain()
        volume_node.connect(audio_context.destination)
        volume_node_ref.current = volume_node
        destination_ref.current = volume_node

        set_initialized(true)
    }, [audio_context])

    function change_volume(next_volume) {
        volume_node_ref.current.gain.value = next_volume
        set_volume(next_volume)
    }

    function play_buffer(audio_buffer, start_time) {
        let analyzer = analyzer_ref.current
        let audio_context = audio_context_ref.current
        let source = audio_context.createBufferSource()
        source.buffer = audio_buffer
        source.connect(destination_ref.current)
        source.connect(analyzer)
        source.start(start_time)
        sources.add(source)
        source.onended = function(){
            sources.delete(source)
        }
        return source
    }

    function stop_all_sources(){
        for (let source of sources) {
            source.stop()
            sources.delete(source)
        }
    }

    function create_delta_play_job() {
        let audio_context = audio_context_ref.current
        if (!audio_context) {
            console.warn("Audio context is not connected.")
            return
        }
        let last_scheduled_time = audio_context.currentTime
    
        function add_delta(delta) {
            let buffer = delta_to_buffer(audio_context, delta)
            let duration = buffer.duration
    
            let play_time = Math.max(last_scheduled_time, audio_context.currentTime)
    
            play_buffer(buffer, play_time)
            last_scheduled_time = play_time + duration
        }
    
        return { add_delta }
    }

    function replay_delta_sequence(audio_deltas) {
        let job = create_delta_play_job()
        for (let delta of audio_deltas) {
            job.add_delta(delta)
        }
    }

    return (
        <AudioHelperContext.Provider value={{
            destination: destination_ref.current,
            volume,
            analyser,
            change_volume,
            create_delta_play_job,
            replay_delta_sequence,
            stop_all_sources
        }}>
            {children}
        </AudioHelperContext.Provider>
    )
}
