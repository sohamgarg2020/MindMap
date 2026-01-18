import whisper

def audio_to_text(path, model_size="base"):
    """
    Audio file → structured transcript using Whisper
    """
    model = whisper.load_model(model_size)

    result = model.transcribe(path)

    segments = ""
    for seg in result["segments"]:
        segments += f"[{round(seg['start'], 2)}–{round(seg['end'], 2)}] {seg['text'].strip()} \n"

    return segments


if __name__ == "__main__":
    segments = audio_to_text(
        "Literature of C.S. Lewis - 01.mp3"
    )

    print(segments)


