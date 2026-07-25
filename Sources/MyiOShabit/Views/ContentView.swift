import SwiftUI

struct ContentView: View {
    @State private var counter = HabitCounter()

    var body: some View {
        NavigationStack {
            VStack(spacing: 28) {
                Text("今日打卡")
                    .font(.title3)
                    .foregroundStyle(.secondary)

                Text("\(counter.count)")
                    .font(.system(size: 96, weight: .bold, design: .rounded))
                    .foregroundStyle(.tint)
                    .contentTransition(.numericText())
                    .animation(.spring(duration: 0.3), value: counter.count)

                HStack(spacing: 24) {
                    Button {
                        counter.decrement()
                    } label: {
                        Image(systemName: "minus")
                            .font(.title.weight(.semibold))
                            .frame(width: 64, height: 64)
                            .background(.thinMaterial, in: .circle)
                    }
                    .accessibilityLabel("减少")

                    Button {
                        counter.increment()
                    } label: {
                        Image(systemName: "plus")
                            .font(.title.weight(.semibold))
                            .frame(width: 64, height: 64)
                            .background(.tint, in: .circle)
                            .foregroundStyle(.white)
                    }
                    .accessibilityLabel("增加")
                }

                Button(role: .destructive) {
                    counter.reset()
                } label: {
                    Text("重置")
                        .font(.callout.weight(.medium))
                }
                .buttonStyle(.bordered)
            }
            .navigationTitle("微习惯打卡")
            .navigationBarTitleDisplayMode(.inline)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(.systemGroupedBackground))
        }
    }
}
