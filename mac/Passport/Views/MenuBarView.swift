import SwiftUI
import AppKit

struct MenuBarView: View {
    @EnvironmentObject private var appState: AppState
    @State private var query = ""

    private var filtered: [Country] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return appState.countries }
        return appState.countries.filter {
            $0.name.lowercased().contains(q) || $0.code.lowercased().contains(q)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Divider()
            TextField("Search country…", text: $query)
                .textFieldStyle(.roundedBorder)
                .padding(12)

            List(filtered) { country in
                Button {
                    Task { await appState.connect(to: country) }
                } label: {
                    HStack {
                        Text(country.flagEmoji)
                        Text(country.name)
                        Spacer()
                        if appState.activeCountry?.code == country.code {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.tint)
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(appState.isBusy)
            }
            .listStyle(.plain)
            .frame(minHeight: 280)

            if let status = appState.statusMessage {
                Text(status)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.bottom, 8)
            }

            Divider()
            footer
        }
        .frame(width: 320, height: 460)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Passport")
                    .font(.headline)
                Text(appState.isConnected
                     ? "Browsing as \(appState.activeCountry?.name ?? "")"
                     : "Not connected")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Circle()
                .fill(appState.isConnected ? Color.green : Color.secondary.opacity(0.4))
                .frame(width: 8, height: 8)
        }
        .padding(12)
    }

    private var footer: some View {
        HStack {
            Button("Disconnect") {
                Task { await appState.disconnect() }
            }
            .disabled(!appState.isConnected || appState.isBusy)

            Spacer()

            SettingsLink {
                Text("Settings")
            }
            .buttonStyle(.plain)

            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
            .buttonStyle(.plain)
        }
        .padding(12)
    }
}
