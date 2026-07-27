import Foundation
import Combine

@MainActor
final class AppState: ObservableObject {
    @Published var countries: [Country] = Country.defaults
    @Published var activeCountry: Country?
    @Published var isConnected = false
    @Published var isBusy = false
    @Published var statusMessage: String?
    @Published var apiBaseURL: String {
        didSet { UserDefaults.standard.set(apiBaseURL, forKey: "apiBaseURL") }
    }
    @Published var membershipId: String {
        didSet { UserDefaults.standard.set(membershipId, forKey: "membershipId") }
    }
    @Published var nativeLanguage: String {
        didSet { UserDefaults.standard.set(nativeLanguage, forKey: "nativeLanguage") }
    }
    @Published var autoTranslate: Bool {
        didSet { UserDefaults.standard.set(autoTranslate, forKey: "autoTranslate") }
    }

    private let api: PassportAPI
    private let proxy: ProxyManager

    init(
        api: PassportAPI = PassportAPI(),
        proxy: ProxyManager = ProxyManager()
    ) {
        self.api = api
        self.proxy = proxy
        self.apiBaseURL = UserDefaults.standard.string(forKey: "apiBaseURL") ?? PassportAPI.defaultBaseURL
        self.membershipId = UserDefaults.standard.string(forKey: "membershipId") ?? ""
        self.nativeLanguage = UserDefaults.standard.string(forKey: "nativeLanguage") ?? "English"
        self.autoTranslate = UserDefaults.standard.bool(forKey: "autoTranslate")

        if let code = UserDefaults.standard.string(forKey: "activeCountryCode"),
           let country = countries.first(where: { $0.code == code }) {
            activeCountry = country
            isConnected = true
        }

        Task { await refreshCountries() }
    }

    func refreshCountries() async {
        api.baseURL = apiBaseURL
        api.membershipId = membershipId.isEmpty ? nil : membershipId
        do {
            let remote = try await api.fetchCountries()
            if !remote.isEmpty {
                countries = remote
            }
        } catch {
            // Keep embedded defaults when the API is offline
            statusMessage = "Using offline country list"
        }
    }

    func connect(to country: Country) async {
        isBusy = true
        statusMessage = nil
        api.baseURL = apiBaseURL
        api.membershipId = membershipId.isEmpty ? nil : membershipId
        defer { isBusy = false }

        do {
            let config = try await api.fetchProxyConfig(countryCode: country.code)
            try proxy.apply(config: config)
            activeCountry = country
            isConnected = true
            UserDefaults.standard.set(country.code, forKey: "activeCountryCode")
            statusMessage = "Connected via \(country.name)"
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    func disconnect() async {
        isBusy = true
        defer { isBusy = false }
        do {
            try proxy.clear()
            activeCountry = nil
            isConnected = false
            UserDefaults.standard.removeObject(forKey: "activeCountryCode")
            statusMessage = "Disconnected"
        } catch {
            statusMessage = error.localizedDescription
        }
    }
}
