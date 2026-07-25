import Foundation
import Observation

/// 习惯计数器：封装计数状态与持久化，与视图解耦。
@MainActor
@Observable
final class HabitCounter {
    private(set) var count: Int {
        didSet { UserDefaults.standard.set(count, forKey: Self.storageKey) }
    }

    private static let storageKey = "habitCount"

    init() {
        self.count = UserDefaults.standard.integer(forKey: Self.storageKey)
    }

    func increment() { count += 1 }
    func decrement() { if count > 0 { count -= 1 } }
    func reset() { count = 0 }
}
