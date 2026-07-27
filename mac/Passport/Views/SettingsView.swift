import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState

    private let languages = LanguageCatalog.names

    var body: some View {
        Form {
            Section("Server") {
                TextField("API base URL", text: $appState.apiBaseURL)
                    .textFieldStyle(.roundedBorder)
                Text("Default: \(PassportAPI.defaultBaseURL)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextField("Whop membership ID (mem_…)", text: $appState.membershipId)
                    .textFieldStyle(.roundedBorder)
                Text("Required to fetch country proxy credentials. Same ID as the Safari/Chrome extension.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Button("Refresh countries") {
                    Task { await appState.refreshCountries() }
                }
            }

            Section("Translation") {
                Picker("Native language", selection: $appState.nativeLanguage) {
                    ForEach(languages, id: \.self) { name in
                        Text(name).tag(name)
                    }
                }
                Toggle("Auto-translate pages (Safari extension)", isOn: $appState.autoTranslate)
                Text("No API key needed. The Mac app sets system proxy for Safari and all apps; page translation uses the Passport Safari extension when installed.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(20)
        .frame(width: 420, height: 340)
    }
}

enum LanguageCatalog {
    static let names: [String] = [
        "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Assamese", "Aymara",
        "Azerbaijani", "Bambara", "Basque", "Belarusian", "Bengali", "Bhojpuri", "Bosnian",
        "Bulgarian", "Catalan", "Cebuano", "Chinese (Simplified)", "Chinese (Traditional)",
        "Corsican", "Croatian", "Czech", "Danish", "Dhivehi", "Dogri", "Dutch", "English",
        "Esperanto", "Estonian", "Ewe", "Filipino", "Finnish", "French", "Frisian", "Galician",
        "Georgian", "German", "Greek", "Guarani", "Gujarati", "Haitian Creole", "Hausa",
        "Hawaiian", "Hebrew", "Hindi", "Hmong", "Hungarian", "Icelandic", "Igbo", "Ilocano",
        "Indonesian", "Irish", "Italian", "Japanese", "Javanese", "Kannada", "Kazakh", "Khmer",
        "Kinyarwanda", "Konkani", "Korean", "Krio", "Kurdish", "Kurdish (Sorani)", "Kyrgyz",
        "Lao", "Latin", "Latvian", "Lingala", "Lithuanian", "Luganda", "Luxembourgish",
        "Macedonian", "Maithili", "Malagasy", "Malay", "Malayalam", "Maltese", "Maori",
        "Marathi", "Meiteilon (Manipuri)", "Mizo", "Mongolian", "Myanmar (Burmese)", "Nepali",
        "Norwegian", "Nyanja (Chichewa)", "Odia (Oriya)", "Oromo", "Pashto", "Persian",
        "Polish", "Portuguese", "Punjabi", "Quechua", "Romanian", "Russian", "Samoan",
        "Sanskrit", "Scots Gaelic", "Sepedi", "Serbian", "Sesotho", "Shona", "Sindhi",
        "Sinhala", "Slovak", "Slovenian", "Somali", "Spanish", "Sundanese", "Swahili",
        "Swedish", "Tagalog", "Tajik", "Tamil", "Tatar", "Telugu", "Thai", "Tigrinya",
        "Tsonga", "Turkish", "Turkmen", "Twi (Akan)", "Ukrainian", "Urdu", "Uyghur",
        "Uzbek", "Vietnamese", "Welsh", "Xhosa", "Yiddish", "Yoruba", "Zulu",
    ]
}
