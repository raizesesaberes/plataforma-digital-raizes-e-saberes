// Verified static files only. Private source/license records are not published.
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const assetRegistry = freeze({
  "schemaVersion": 1,
  "editorialRevision": "carla-editorial-2026-11-10-v1",
  "release": {
    "status": "approved",
    "approvalRef": "carla-local-p00-p06-20261110"
  },
  "licenses": [
    {
      "id": "commercial-voice-20261110",
      "provider": "ElevenLabs",
      "commercialUse": true,
      "status": "confirmed",
      "confirmedOn": "2026-11-10",
      "evidenceRef": "commercial-generation-20261110"
    }
  ],
  "assets": [
    {
      "clipId": "colorir.cachorro.welcome",
      "textSha256": "bd4ace2eb4462aa00f376d81e90ae65250cb4ec1bc633db1c71ee93e0da68afb",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-welcome.mp3",
      "sha256": "96559cf5830e4e62629084da0afd3553277434f3cd277a63da61ee4be21078e8",
      "bytes": 86736,
      "durationSeconds": 4.362438,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cachorro.discovery_4_5",
      "textSha256": "e3dacfd5905d73c7962fb876221c9b41aa5635fe3405f153f8ebe2e0aae42475",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-discovery_4_5.mp3",
      "sha256": "0a531128bd17190a6a3367fe9fe6655409f2017c4ccf2ee88d2c60ef5527a5f9",
      "bytes": 163640,
      "durationSeconds": 9.168938,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.numero3.count_three",
      "textSha256": "616d1fc91b4e30ba02749eb466d0b6557d2015d95a1aa3f437e7cdba34a84206",
      "bindings": [
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-numero3-count_three.mp3",
      "sha256": "50f464fa966fbf4bbe052242f5614f276633db05da8013734cb94350c86165ff",
      "bytes": 112231,
      "durationSeconds": 5.955875,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.audio_unavailable",
      "textSha256": "2f0b642d4769c6ebc65ebddcc9c95b80be539f210ff3dc0c0011ebe20722ba97",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-audio_unavailable.mp3",
      "sha256": "0a93971edf95f3539c8f1bcfd79675c3eb16deaa27ed4ae6a15289adb76ebd27",
      "bytes": 119754,
      "durationSeconds": 6.426063,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "quiz-exemplo-pergunta",
      "textSha256": "1ff7f71e7bae6fa11fff7060f37959b81b5fe078c621ca433d9a703cbae3f276",
      "bindings": [
        "game:ed05-EF1-ciencias-variedades-quiz-01:quiz:012f1f76874dd36ba25a2680d08f52ca5d23dc6ee3a993a42f67814f6e34beb3"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/quiz-exemplo-pergunta.mp3",
      "sha256": "89d990b7fc453b14ef2fe3894ef5a439b0fb42506095a527f87ecc77a27f39dc",
      "bytes": 177433,
      "durationSeconds": 10.031,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "word-search-exemplo-explicacao",
      "textSha256": "796731aba077e0cff0c72e74072afe1ea10aea29d89607f83a5fa2bb6a5ef6d8",
      "bindings": [
        "game:ed05-EM3-ciencias-variedades-word-search-01:word-search:cb48a6d90363d49ac80272f73f7d09317d2c9dc5ba49e1d7061981bc2e0e09f6"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/word-search-exemplo-explicacao.mp3",
      "sha256": "b4e61218a9628cda1b94676a396d8da033324da69117b02a59edf9130e4f869a",
      "bytes": 272310,
      "durationSeconds": 15.960813,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-006-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_touch",
      "textSha256": "5283cc215c7f7f3fbf81936793e2800b82597916aca7a142d139af90e481c217",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_touch.mp3",
      "sha256": "1e447f0e1b1535029f311b993f980a0462f493dc34d86cd20ea5ca30686399a4",
      "bytes": 133965,
      "durationSeconds": 7.31425,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_more_colors",
      "textSha256": "3cfd01321844067ae86fa5749b875cdf3abefc2d4c3c7962558852bf3693a415",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_more_colors.mp3",
      "sha256": "2976dddb46f1687b19f90a0c62618d358e21c6f6282e21b12a851ad3ba23f4c2",
      "bytes": 93005,
      "durationSeconds": 4.75425,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_brush",
      "textSha256": "c299895a5fb1b578bb462d155d851eb22a69af1e50d4769faa1b68f3009e88c1",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_brush.mp3",
      "sha256": "502365979aad3a25f856a66d931fa82bd664e7d374009a2dde0da10d39343612",
      "bytes": 149430,
      "durationSeconds": 8.280813,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_erase",
      "textSha256": "5e7a78ccfd5b44af8d83b33161c37619c7a510651d4f80baddccedbd68f57b45",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_erase.mp3",
      "sha256": "ee8a5e1d0dfbd34e2780e8551c2d9a25f182e0cf5a7f1f03bfbdfaf4b1f20150",
      "bytes": 103454,
      "durationSeconds": 5.407313,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_undo",
      "textSha256": "1f638b1b5f8e740a9bca2811ceb64e20cbf6f8ac2fca705326dd18c94cceb907",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_undo.mp3",
      "sha256": "5226743bf031c04eed67143b24e0ab4f276f1cc3d49e963722a891696ceedf8c",
      "bytes": 71271,
      "durationSeconds": 3.395875,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_keyboard",
      "textSha256": "01dd6a9eb870205f8e9d3d2d83c59ebd8dd1a80910a76993190f1d1fc508e5c3",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_keyboard.mp3",
      "sha256": "bfef3f3dbff486ae626c8bb108aca701da8f320395e679a1f6d61cdddab29b60",
      "bytes": 110977,
      "durationSeconds": 5.8775,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-006-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.life_invite",
      "textSha256": "d51dc355bed7c25def10cb077c1b8bc74d68e9939275682c512e41b6e0734b5b",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-life_invite.mp3",
      "sha256": "0c6fb54ab18993fd7e00b3f7ac5c2582170d887f9d3fa400351a2d60e918d86a",
      "bytes": 141906,
      "durationSeconds": 7.810563,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-007-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.life_show",
      "textSha256": "c102648f8dda2d9b789b14758f23f848706e74bdfb36a3b6a8de61169c1c9d4a",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-life_show.mp3",
      "sha256": "f96e2ebbb44c125b9b1d05e6f6ff2e2784a4c324915864f3e7a05bb93b4d2966",
      "bytes": 68763,
      "durationSeconds": 3.239125,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-008-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.life_no_paint",
      "textSha256": "1fd8fa6c713345e93677ba73be0c723e5fe230235bd1ee6db887892614cb6d16",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-life_no_paint.mp3",
      "sha256": "5efe76c1ce99b48f883cfa661917b3dc6d174f16f2bdff8dcf5e99464897a055",
      "bytes": 90497,
      "durationSeconds": 4.5975,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-009-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.life_pause",
      "textSha256": "03b37df6cf6ef57b14969c04376c2f1d38882526b07a2ba7bad3f2be5e15fb5e",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-life_pause.mp3",
      "sha256": "20e0e80155a5bccf092a72588175e0c6e63bd0f54e188033e9b39cb4997201e6",
      "bytes": 77541,
      "durationSeconds": 3.78775,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-010-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.finished",
      "textSha256": "08239830f44596714da96346f5ceb6208da80afaf47e77364c48bc5b7a805635",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-finished.mp3",
      "sha256": "a91e38e16bcabcb9f344ab70ed18c7958c79cb254fa28f55f2e559bed49b0b18",
      "bytes": 96767,
      "durationSeconds": 4.989375,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-011-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.permission_to_observe",
      "textSha256": "3c0deafa3a38fb0682ee7fdff8fad294b29226b8a06618149326ec3aed2717bd",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-permission_to_observe.mp3",
      "sha256": "4dd8c430631851a3b968bd70793b905730ac73d1d7c967ba4469fa095ca1e19c",
      "bytes": 123934,
      "durationSeconds": 6.687313,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-012-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.skip_sounds",
      "textSha256": "d109f78c3da8ec966c12e85facc45b9e3fda79273f88fb2293652b9a0af6f042",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-skip_sounds.mp3",
      "sha256": "2102bc383d9b692e0b83729d86d4f32a1f92fef7810fcee99244e8425331686e",
      "bytes": 68763,
      "durationSeconds": 3.239125,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-013-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cachorro.discovery_2_3",
      "textSha256": "eb6a66cf991a5827f23d685d4a76c4957d55294d99dca12ffcb24c4d6312c1ba",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-discovery_2_3.mp3",
      "sha256": "c5c4d99aeb223b020d1e5ef5103039f61c04c494e5cd208154a3692ad35bf9da",
      "bytes": 73779,
      "durationSeconds": 3.552625,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p02-20261110",
        "sourceReference": "source-p02-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cachorro.sound_4_5",
      "textSha256": "723ee61b30224850525d9ca4732794e6f8d3931db933d85a55e5c853c1983448",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-sound_4_5.mp3",
      "sha256": "b30e9c9430cbabb866020f8870179d81fdffc62be22bd24423da24d8ddeecdf6",
      "bytes": 163640,
      "durationSeconds": 9.168938,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p02-20261110",
        "sourceReference": "source-p02-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cachorro.letter_4_5",
      "textSha256": "1d48814387d58306ac99738188f5f3fa9a4c385496b7690c824c161e0946e1de",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-letter_4_5.mp3",
      "sha256": "baccab9233cc1c5ab591259037f5c5a4a89582d75a6c10b9c087c6d686548af5",
      "bytes": 126442,
      "durationSeconds": 6.844063,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p02-20261110",
        "sourceReference": "source-p02-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.welcome",
      "textSha256": "19416e830b81e517ef7cc18729e4b34fa38d8d25c359c90ffb92c05c76b2844e",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-welcome.mp3",
      "sha256": "337eefae2524981bbab2074fdcd48bdd6efb83d5f84c654fffad2b8624219385",
      "bytes": 110977,
      "durationSeconds": 5.8775,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.discovery_2_3",
      "textSha256": "423843673a4590ef75f40291115ea84bf1af10ee277216efd11327bdc319da6e",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-discovery_2_3.mp3",
      "sha256": "5593246d6b1a94bac5baf540dc731d55f8bc42450a0a8b9479112b7e02a77649",
      "bytes": 75033,
      "durationSeconds": 3.631,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.discovery_4_5",
      "textSha256": "95febca2a80731e6f06b60b7cfbfeabc3b8e72a0b9e12f6882ff94be529463db",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-discovery_4_5.mp3",
      "sha256": "1fd744a258f2cf6782d5eb07c678836364740f8ae8205b8de9b456914ae565bc",
      "bytes": 125188,
      "durationSeconds": 6.765688,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.sound_4_5",
      "textSha256": "f81fab7518de7b548b84d6401cc3dec4248bf402e8252bd997e1e8a33035550f",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-sound_4_5.mp3",
      "sha256": "f6869965113b3f2e83de59c185bd90e45d3c7c28f609f336e7d5d135d351cd00",
      "bytes": 162386,
      "durationSeconds": 9.090563,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.letter_4_5",
      "textSha256": "57c9b9a756fa3c0b53a2e47bcaded666e3dbadbffbc8e531b9fb82ff0ce5a4fb",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-letter_4_5.mp3",
      "sha256": "e55775525048e0b2a16ff503a833040abd830888984cb3e9c6ad4ca781f34e8c",
      "bytes": 109723,
      "durationSeconds": 5.799125,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.welcome",
      "textSha256": "25c96c8ee7a42c4b76935f659988b68a8a4c95356655ee97d9060989325b5a48",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-welcome.mp3",
      "sha256": "08c54278b4a70fdfa877e09d6af25570e7276b8a06c58ae370c1b601de37f6c8",
      "bytes": 109723,
      "durationSeconds": 5.799125,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.discovery_2_3",
      "textSha256": "29c309da682eaca1df1b1751f7cffe88c07d758be0c3398495069dfe8405a8c9",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-discovery_2_3.mp3",
      "sha256": "1a03804d480aafd443fda501a1a3acd43eb7ad8230b7c2d8b0e1042d069589cd",
      "bytes": 77541,
      "durationSeconds": 3.78775,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.discovery_4_5",
      "textSha256": "3430d5a048de7a6e5861358d0fba6730b1ed93c7a11c5fedd063fe81f4dc782a",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-discovery_4_5.mp3",
      "sha256": "32f9f9842420f5c3b2f09aa28d325fb073267cbb8a617d1f6534a248df84bfc4",
      "bytes": 122680,
      "durationSeconds": 6.608938,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.sound_4_5",
      "textSha256": "78b364d321567b421e9379bcc0de514ba71e702f83dc63e1a240ad7d353fb3d5",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-sound_4_5.mp3",
      "sha256": "cb58c158c6afd00320e62f4f46d9718fa8202d30fb1e7483528f3c95a30dbc3a",
      "bytes": 140234,
      "durationSeconds": 7.706063,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.letter_4_5",
      "textSha256": "0c52bb61e7706763f5c3f580f138a6bfe425a57e882f1bdd6564644d6012a1f0",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-letter_4_5.mp3",
      "sha256": "48e50b14dc233f137d6d5fb52d6881fe1e275949b3eb378a0e0122de5f6bc0cb",
      "bytes": 123934,
      "durationSeconds": 6.687313,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.welcome",
      "textSha256": "fc1e83fac054d2c80ea6f52d5daf7dcc0cbdf09391e7cbd80267368a7cf626e1",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-welcome.mp3",
      "sha256": "efe8ee0fb1b848186a87c94cd5f6275a7856969baac1ed65c535633560c91b6d",
      "bytes": 131457,
      "durationSeconds": 7.1575,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.discovery_2_3",
      "textSha256": "425cd8a6e7fe2e096133db1f12552074365dfbcad6dff7ba44bd38feec9e1d78",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-discovery_2_3.mp3",
      "sha256": "1caf3e495f73a3c9c4573cbc5d7ba93854d918ac506637e313179258ead3f172",
      "bytes": 68763,
      "durationSeconds": 3.239125,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.discovery_4_5",
      "textSha256": "ad2c69f215a3f1956d5c3f5af4d8a993635c1273d6030f42cc6cecfac7c76835",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-discovery_4_5.mp3",
      "sha256": "f14061e02e7a89f4ed4c352c5b514d12ad5658bb1567b4ccb6953e99ca5757ab",
      "bytes": 113485,
      "durationSeconds": 6.03425,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.sound_4_5",
      "textSha256": "5c8ec94369bbc0ecf02dd38bb99b95e81f7391dc2d56dd94a4ba9860595f24d6",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-sound_4_5.mp3",
      "sha256": "f0ff174cd2f764819d103cdfa766c1c73f2ddb992a14ed75a32beefbe392358d",
      "bytes": 151937,
      "durationSeconds": 8.4375,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.letter_4_5",
      "textSha256": "525e30bda1edff97676b391d4393238ba6ddc298826064eb507b3b7ca7275e1f",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-letter_4_5.mp3",
      "sha256": "b2df9a1468f6408b0e589a9d1a9bfd43aeb05e3e8e8f5f4e7dc0e663ff6fa7f2",
      "bytes": 115993,
      "durationSeconds": 6.191,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.welcome",
      "textSha256": "6dc1c7ef9bac51babd0904d42306fc3574fb455f829b02d0463e58d432939218",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-welcome.mp3",
      "sha256": "a8a8f7aa785454fd263da815465c1dea842eb4aafd325a03a9ac17a41cb828c0",
      "bytes": 122680,
      "durationSeconds": 6.608938,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.discovery_2_3",
      "textSha256": "d034ec7e0431e57695f7306f38f6a1069db7892a4f1a05973f3dbfc178f5ff78",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-discovery_2_3.mp3",
      "sha256": "a24d8094f8293cfb0b3f2c3e7633f91e42785a0d5097aa053c7aa59642946bf5",
      "bytes": 66256,
      "durationSeconds": 3.082438,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.discovery_4_5",
      "textSha256": "3770247d4e881975108824bcc99fa1a6c52a6985a90507cb0fa3c17c599e11e2",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-discovery_4_5.mp3",
      "sha256": "d6baa8ac084bba57bedbf7f09f47f176d2ee2f96d11bcaacad2a95abaf06ffb8",
      "bytes": 130203,
      "durationSeconds": 7.079125,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.sound_4_5",
      "textSha256": "b08773445d7a33080223176439c9cfb1def61dddae9d2c26ecbd02392bd1a440",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-sound_4_5.mp3",
      "sha256": "2cb8c60ffe32205f29dd013a78dbdb22ff064ea895c92ac57fa153e17d710639",
      "bytes": 138981,
      "durationSeconds": 7.62775,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.letter_4_5",
      "textSha256": "9b141272c2ebc709c863f0019952146b516c949586c271c13ba176d25d51a65b",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-letter_4_5.mp3",
      "sha256": "05184d8238b48133306c92a0bccedb5eccddb3e54ad10ad5abfda9b83564aa8c",
      "bytes": 118501,
      "durationSeconds": 6.34775,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    }
  ]
});
